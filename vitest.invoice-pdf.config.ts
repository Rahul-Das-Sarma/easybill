import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.mjs";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/modules/invoice-pdf/**/*.test.ts"],
    server: {
      deps: {
        inline: [
          "src/lib/invoice-pdf/load-payload.ts",
          "src/lib/invoice-pdf/invoice-html.ts",
          "src/lib/invoice-pdf/render-pdf.tsx",
          "src/lib/invoice-pdf/storage-upload.ts",
          "src/app/api/invoices/[id]/pdf/route.ts",
          "src/app/api/invoices/[id]/pdf-data/route.ts",
          "src/app/api/invoices/[id]/signed-pdf-url/route.ts",
        ],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/invoice-pdf",
      include: [
        "src/lib/invoice-pdf/load-payload.ts",
        "src/lib/invoice-pdf/invoice-html.ts",
        "src/lib/invoice-pdf/render-pdf.tsx",
        "src/lib/invoice-pdf/storage-upload.ts",
        "src/app/api/invoices/*/pdf/route.ts",
        "src/app/api/invoices/*/pdf-data/route.ts",
        "src/app/api/invoices/*/signed-pdf-url/route.ts",
      ],
      exclude: ["**/*.test.ts", "tests/**"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
