import { describe, expect, it } from "vitest";

import { buildInvoiceHtml } from "@/lib/invoice-pdf/invoice-html";

import { createSamplePdfPayload } from "../../mocks/invoice-pdf-store";

describe("invoice-html", () => {
  it("builds regular intra-state tax invoice HTML", () => {
    const html = buildInvoiceHtml(createSamplePdfPayload());

    expect(html).toContain("Tax Invoice");
    expect(html).toContain("INV-2026-001");
    expect(html).toContain("CGST");
    expect(html).toContain("SGST");
    expect(html).not.toContain("IGST</th>");
    expect(html).toContain("Powered by EasyBill");
    expect(html).toContain("Thank you for your business.");
  });

  it("builds inter-state HTML with IGST columns", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        invoice: {
          ...createSamplePdfPayload().invoice,
          supplyType: "inter",
          cgstAmount: "0.00",
          sgstAmount: "0.00",
          igstAmount: "180.00",
        },
        items: [
          {
            ...createSamplePdfPayload().items[0]!,
            cgstAmount: "0.00",
            sgstAmount: "0.00",
            igstAmount: "180.00",
          },
        ],
      }),
    );

    expect(html).toContain("IGST</th>");
    expect(html).not.toContain("CGST</th>");
  });

  it("builds composition scheme bill of supply without GST columns", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        invoice: {
          ...createSamplePdfPayload().invoice,
          gstSchemeAtIssue: "composition",
          supplyType: "none",
          taxAmount: "0.00",
          cgstAmount: "0.00",
          sgstAmount: "0.00",
          igstAmount: "0.00",
        },
      }),
    );

    expect(html).toContain("Bill of Supply");
    expect(html).toContain("Composition taxable person");
    expect(html).not.toContain("GST%</th>");
  });

  it("shows pro plan footer logo instead of powered by text", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        plan: "pro",
        business: {
          ...createSamplePdfPayload().business,
          logoUrl: "https://cdn.example.com/logo.png",
        },
      }),
    );

    expect(html).not.toContain("Powered by EasyBill");
    expect(html).toContain('src="https://cdn.example.com/logo.png"');
  });

  it("escapes HTML in product names and notes", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        items: [
          {
            ...createSamplePdfPayload().items[0]!,
            productName: '<script>alert("x")</script>',
          },
        ],
        invoice: {
          ...createSamplePdfPayload().invoice,
          customerNotes: 'Pay & "confirm"',
        },
      }),
    );

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("Pay &amp; &quot;confirm&quot;");
  });

  it("omits invalid logo URLs and leaves currency values unchanged when unparsable", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        business: {
          ...createSamplePdfPayload().business,
          logoUrl: "/relative/logo.png",
        },
        invoice: {
          ...createSamplePdfPayload().invoice,
          subtotal: "not-a-number",
        },
      }),
    );

    expect(html).not.toContain("/relative/logo.png");
    expect(html).toContain("not-a-number");
  });

  it("shows free-plan header logo when logo URL is absolute", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        plan: "free",
        business: {
          ...createSamplePdfPayload().business,
          logoUrl: "https://cdn.example.com/logo.png",
        },
      }),
    );

    expect(html).toContain('class="logo"');
    expect(html).toContain("Powered by EasyBill");
  });

  it("renders business contact line with phone only", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        business: {
          ...createSamplePdfPayload().business,
          email: "",
          phone: "9876543210",
        },
      }),
    );

    expect(html).toContain("9876543210");
    expect(html).not.toContain(" · ");
  });

  it("omits pro footer branding when logo is unavailable", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        plan: "pro",
        business: {
          ...createSamplePdfPayload().business,
          logoUrl: null,
        },
      }),
    );

    expect(html).toContain('<div class="footer"></div>');
  });

  it("renders em dash for missing GSTIN values", () => {
    const html = buildInvoiceHtml(
      createSamplePdfPayload({
        business: {
          ...createSamplePdfPayload().business,
          gstNumber: null,
        },
        customer: {
          ...createSamplePdfPayload().customer,
          gstNumber: null,
          address: null,
          phone: null,
          email: null,
        },
        invoice: {
          ...createSamplePdfPayload().invoice,
          customerNotes: null,
        },
      }),
    );

    expect(html).toContain("GSTIN: —");
    expect(html).not.toContain("Terms &amp; notes");
  });
});
