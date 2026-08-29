import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
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
