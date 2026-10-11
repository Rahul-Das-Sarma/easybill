import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser, getSessionUser } from "@/lib/auth-user";
import { NicError, registerEwayBill } from "@/lib/compliance/nic-client";
import { openSecret } from "@/lib/compliance/secrets";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  distanceKm: z.coerce.number().int().min(1).max(4000),
  vehicleNo: z.string().min(4).max(15),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureAppUser(user);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter distance in km and a vehicle number." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const [seller, invoice] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.invoice.findFirst({ where: { id, userId: user.id } }),
  ]);
  if (!seller || !invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!invoice.irn) {
    return NextResponse.json(
      { error: "Generate the IRN before the e-way bill." },
      { status: 400 },
    );
  }
  if (invoice.ewayBillNo) {
    return NextResponse.json({ ewayBillNo: invoice.ewayBillNo });
  }
  if (
    !seller.gstNumber ||
    !seller.einvoiceUsername ||
    !seller.einvoicePasswordEnc ||
    !seller.einvoiceClientId ||
    !seller.einvoiceSecretEnc ||
    !seller.einvoicePublicKey
  ) {
    return NextResponse.json(
      { error: "E-invoice portal credentials are incomplete in Settings." },
      { status: 400 },
    );
  }

  try {
    const bill = await registerEwayBill({
      env: seller.einvoiceEnv === "production" ? "production" : "sandbox",
      gstin: seller.gstNumber.toUpperCase(),
      username: seller.einvoiceUsername,
      password: openSecret(seller.einvoicePasswordEnc),
      clientId: seller.einvoiceClientId,
      clientSecret: openSecret(seller.einvoiceSecretEnc),
      publicKeyPem: seller.einvoicePublicKey,
      irn: invoice.irn,
      distanceKm: parsed.data.distanceKm,
      vehicleNo: parsed.data.vehicleNo,
    });
    const billDate = new Date(bill.ewayBillDate);
    const validTill = new Date(bill.validTill);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        ewayBillNo: bill.ewayBillNo,
        ewayBillDate: Number.isNaN(billDate.getTime()) ? new Date() : billDate,
        ewayValidTill: Number.isNaN(validTill.getTime()) ? null : validTill,
      },
    });
    return NextResponse.json(bill);
  } catch (error) {
    const message =
      error instanceof NicError
        ? error.message
        : "Could not reach the e-way bill service.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
