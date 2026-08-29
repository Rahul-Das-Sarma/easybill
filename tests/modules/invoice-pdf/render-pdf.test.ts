import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const puppeteerMocks = vi.hoisted(() => ({
  launch: vi.fn(),
  pagePdf: vi.fn(),
  setContent: vi.fn(),
  close: vi.fn(),
  reactPdfToBuffer: vi.fn(),
}));

vi.mock("puppeteer", () => ({
  default: {
    launch: puppeteerMocks.launch,
  },
}));

vi.mock("puppeteer-core", () => ({
  default: {
    launch: puppeteerMocks.launch,
  },
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox"],
    executablePath: vi.fn().mockResolvedValue("/chromium"),
  },
}));

vi.mock("node:stream/consumers", () => ({
  buffer: vi.fn(async () => Buffer.from("%PDF-react")),
}));

vi.mock("@react-pdf/renderer", () => ({
  pdf: () => ({
    toBuffer: puppeteerMocks.reactPdfToBuffer,
  }),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  Image: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
}));

import {
  renderInvoicePdfBuffer,
  renderInvoicePdfWithPuppeteer,
  renderInvoicePdfWithReactPdf,
} from "@/lib/invoice-pdf/render-pdf";

import { createSamplePdfPayload } from "../../mocks/invoice-pdf-store";

function mockBrowser() {
  puppeteerMocks.setContent.mockResolvedValue(undefined);
  puppeteerMocks.pagePdf.mockResolvedValue(Buffer.from("%PDF-puppeteer"));
  puppeteerMocks.close.mockResolvedValue(undefined);
  puppeteerMocks.launch.mockResolvedValue({
    newPage: vi.fn().mockResolvedValue({
      setContent: puppeteerMocks.setContent,
      pdf: puppeteerMocks.pagePdf,
    }),
    close: puppeteerMocks.close,
  });
}

describe("render-pdf", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
    delete process.env.VERCEL;
    mockBrowser();
    puppeteerMocks.reactPdfToBuffer.mockResolvedValue(
      Buffer.from("%PDF-react"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...envBackup };
    vi.restoreAllMocks();
  });

  it("renders HTML to PDF with local puppeteer", async () => {
    const buffer = await renderInvoicePdfWithPuppeteer("<html></html>");
    expect(buffer.toString()).toBe("%PDF-puppeteer");
    expect(puppeteerMocks.launch).toHaveBeenCalled();
  });

  it("uses chromium build on Vercel", async () => {
    process.env.VERCEL = "1";
    const buffer = await renderInvoicePdfWithPuppeteer("<html></html>");
    expect(buffer.toString()).toBe("%PDF-puppeteer");
  });

  it("renders via react-pdf fallback helper", async () => {
    const buffer = await renderInvoicePdfWithReactPdf(createSamplePdfPayload());
    expect(buffer.toString()).toBe("%PDF-react");
  });

  it("falls back to react-pdf when puppeteer fails", async () => {
    puppeteerMocks.launch.mockRejectedValueOnce(new Error("no chrome"));

    const buffer = await renderInvoicePdfBuffer(createSamplePdfPayload());
    expect(buffer.toString()).toBe("%PDF-react");
    expect(console.error).toHaveBeenCalled();
  });
});
