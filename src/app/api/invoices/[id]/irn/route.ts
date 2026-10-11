import { NextResponse } from "next/server";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import {
  buildEinvoicePayload,
  einvoiceReadiness,
  type EinvoiceInput,
} from "@/lib/compliance/einvoice-payload";
import { NicError, registerInvoice } from "@/lib/compliance/nic-client";
import { openSecret } from "@/lib/compliance/secrets";
import { stateNameFromCode } from "@/lib/gst-india";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function num(value: { toString(): string }) {
  return Number(value.toString());
}

export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  const { id } = await params;
  const [seller, invoice] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  if (!seller || !invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invoice.status === "draft") {
    return NextResponse.json(
      { error: "Issue the invoice before generating an IRN." },
      { status: 400 },
    );
  }
  if (invoice.irn) {
    return NextResponse.json({ irn: invoice.irn, ackNo: invoice.irnAckNo });
  }
  if (
    !seller.einvoiceUsername ||
    !seller.einvoicePasswordEnc ||
    !seller.einvoiceClientId ||
    !seller.einvoiceSecretEnc ||
    !seller.einvoicePublicKey
  ) {
    return NextResponse.json(
      {
        error:
          "Add your e-invoice API username, password, client id, secret, and public key in Settings.",
      },
      { status: 400 },
    );
  }

  const sellerState = seller.stateCode ?? seller.gstNumber?.slice(0, 2) ?? "";
  const buyerState =
    invoice.customer.stateCode ?? invoice.customer.gstNumber?.slice(0, 2) ?? "";
  const input: EinvoiceInput = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    supplyType: invoice.supplyType === "inter" ? "inter" : "intra",
    seller: {
      gstin: (seller.gstNumber ?? "").toUpperCase(),
      legalName: seller.companyName,
      address: seller.address,
      city: seller.city ?? "",
      pincode: seller.pincode ?? "",
      stateCode: sellerState,
    },
    buyer: {
      gstin: (invoice.customer.gstNumber ?? "").toUpperCase(),
      legalName: invoice.customer.name,
      address: invoice.customer.address ?? "",
      city: stateNameFromCode(buyerState) ?? buyerState,
      pincode: invoice.customer.pincode ?? "",
      stateCode: buyerState,
    },
    lines: invoice.items.map((item) => ({
      productName: item.productName,
      hsnCode: item.hsnCode,
      quantity: num(item.quantity),
      unitPrice: num(item.unitPrice),
      taxRate: num(item.taxRate),
      taxableValue: num(item.quantity) * num(item.unitPrice),
      cgstAmount: num(item.cgstAmount),
      sgstAmount: num(item.sgstAmount),
      igstAmount: num(item.igstAmount),
      total: num(item.total),
    })),
    taxableValue: num(invoice.subtotal) - num(invoice.discountAmount),
    cgstAmount: num(invoice.cgstAmount),
    sgstAmount: num(invoice.sgstAmount),
    igstAmount: num(invoice.igstAmount),
    totalAmount: num(invoice.totalAmount),
  };

  const errors = einvoiceReadiness(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  try {
    const registered = await registerInvoice({
      env: seller.einvoiceEnv === "production" ? "production" : "sandbox",
      gstin: input.seller.gstin,
      username: seller.einvoiceUsername,
      password: openSecret(seller.einvoicePasswordEnc),
      clientId: seller.einvoiceClientId,
      clientSecret: openSecret(seller.einvoiceSecretEnc),
      publicKeyPem: seller.einvoicePublicKey,
      payload: buildEinvoicePayload(input),
    });
    const ackDate = new Date(registered.ackDate);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        irn: registered.irn,
        irnAckNo: registered.ackNo || null,
        irnAckDate: Number.isNaN(ackDate.getTime()) ? new Date() : ackDate,
        irnSignedQr: registered.signedQr || null,
      },
    });
    return NextResponse.json(registered);
  } catch (error) {
    const message =
      error instanceof NicError
        ? error.message
        : "Could not reach the e-invoice portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
