import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.mjs";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/modules/ui-components/**", "tests/modules/invoice-pdf/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/gst-india.ts",
        "src/lib/invoice-math.ts",
        "src/lib/invoice-payment-status.ts",
        "src/lib/production-materials.ts",
        "src/lib/number-input.ts",
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
