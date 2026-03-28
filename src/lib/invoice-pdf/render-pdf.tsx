import React from "react";
import { buffer as streamToBuffer } from "node:stream/consumers";

import { InvoicePdfDocument } from "@/components/invoices/invoice-pdf-document";

import { buildInvoiceHtml } from "./invoice-html";
import type { InvoicePdfPayload } from "./types";

export async function renderInvoicePdfWithPuppeteer(
  html: string,
): Promise<Buffer> {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "20mm", left: "12mm", right: "12mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "20mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function renderInvoicePdfWithReactPdf(
  data: InvoicePdfPayload,
): Promise<Buffer> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = pdf(<InvoicePdfDocument data={data} />);
  const stream = await doc.toBuffer();
  return await streamToBuffer(stream as NodeJS.ReadableStream);
}

export async function renderInvoicePdfBuffer(
  data: InvoicePdfPayload,
): Promise<Buffer> {
  const html = buildInvoiceHtml(data);
  try {
    return await renderInvoicePdfWithPuppeteer(html);
  } catch (e) {
    console.error(
      "Puppeteer PDF failed, falling back to @react-pdf/renderer:",
      e,
    );
    return renderInvoicePdfWithReactPdf(data);
  }
}
