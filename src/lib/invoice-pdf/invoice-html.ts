import type { InvoicePdfPayload } from "./types";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtInr(n: string) {
  const x = Number.parseFloat(n);
  if (Number.isNaN(x)) return n;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(x);
}

export function buildInvoiceHtml(data: InvoicePdfPayload): string {
  const { business, customer, invoice, items, plan } = data;
  const logoSrc =
    business.logoUrl && business.logoUrl.startsWith("http")
      ? business.logoUrl
      : null;
  const logoTag = logoSrc
    ? `<img class="logo" src="${esc(logoSrc)}" alt="" crossorigin="anonymous" />`
    : "";

  const headerLogoBlock = plan === "free" && logoTag ? logoTag : "";
  const footerInner =
    plan === "free"
      ? `<p class="powered">Powered by EasyBill</p>`
      : logoTag
        ? `<div class="footer-brand">${logoTag}</div>`
        : "";

  const rows = items
    .map(
      (it) => `
    <tr>
      <td>${esc(it.productName)}</td>
      <td class="num">${esc(it.quantity)}</td>
      <td class="num">${fmtInr(it.unitPrice)}</td>
      <td class="num">${esc(it.taxRate)}%</td>
      <td class="num">${fmtInr(it.taxAmount)}</td>
      <td class="num">${fmtInr(it.total)}</td>
    </tr>`,
    )
    .join("");

  const customerNotesBlock = invoice.customerNotes
    ? `<section class="notes"><h3>Terms &amp; notes</h3><p>${esc(invoice.customerNotes).replaceAll("\n", "<br/>")}</p></section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 11px; color: #111; margin: 0; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 12px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
    .logo { max-height: 48px; max-width: 160px; object-fit: contain; margin-bottom: 8px; display: block; }
    .meta { text-align: right; font-size: 10px; color: #444; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .box { border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
    .box p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 8px 6px; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; color: #666; background: #fafafa; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 12px; max-width: 280px; margin-left: auto; }
    .totals tr td { border: none; padding: 4px 6px; }
    .totals .grand { font-weight: 700; font-size: 13px; border-top: 2px solid #111; }
    .notes { margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 6px; font-size: 10px; }
    .footer { position: fixed; bottom: 12px; left: 24px; right: 24px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
    .powered { margin: 4px 0 0; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${headerLogoBlock}
      <h1>${esc(business.companyName)}</h1>
      <p>${esc(business.address)}</p>
      <p>GSTIN: ${business.gstNumber ? esc(business.gstNumber) : "—"}</p>
      <p>${business.phone ? esc(business.phone) : ""} ${business.email ? " · " + esc(business.email) : ""}</p>
    </div>
    <div class="meta">
      <div><strong>Tax Invoice</strong></div>
      <div>${esc(invoice.invoiceNumber)}</div>
      <div>Issue: ${esc(invoice.issueDate)}</div>
      <div>Due: ${esc(invoice.dueDate)}</div>
      <div>Status: ${esc(invoice.status)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h2>Bill to</h2>
      <p><strong>${esc(customer.name)}</strong></p>
      <p>${customer.address ? esc(customer.address) : ""}</p>
      <p>GSTIN: ${customer.gstNumber ? esc(customer.gstNumber) : "—"}</p>
      <p>${customer.phone ? esc(customer.phone) : ""}</p>
      <p>${customer.email ? esc(customer.email) : ""}</p>
    </div>
  </div>

  <h2>Line items</h2>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">GST%</th>
        <th class="num">GST</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal (taxable)</td><td class="num">${fmtInr(invoice.subtotal)}</td></tr>
    <tr><td>Discount</td><td class="num">− ${fmtInr(invoice.discountAmount)}</td></tr>
    <tr><td>Total GST</td><td class="num">${fmtInr(invoice.taxAmount)}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${fmtInr(invoice.totalAmount)}</td></tr>
    <tr><td>Amount paid</td><td class="num">${fmtInr(invoice.amountPaid)}</td></tr>
  </table>

  ${customerNotesBlock}

  <div class="footer">${footerInner}</div>
</body>
</html>`;
}
