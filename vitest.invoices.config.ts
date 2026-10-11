import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.mjs";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/modules/invoices/**/*.test.ts"],
    server: {
      deps: {
        inline: [
          "src/app/api/invoices/route.ts",
          "src/app/api/invoices/[id]/route.ts",
          "src/app/api/invoices/[id]/issue/route.ts",
        ],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/invoices",
      include: [
        "src/app/api/invoices/route.ts",
        "src/app/api/invoices/[id]/route.ts",
        "src/app/api/invoices/*/issue/route.ts",
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
