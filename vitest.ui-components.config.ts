import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup-dom.ts"],
    include: [
      "tests/modules/ui-components/**/*.test.ts",
      "tests/modules/ui-components/**/*.test.tsx",
    ],
    server: {
      deps: {
        inline: [
          "src/components/page-header.tsx",
          "src/components/invoices/invoice-lifecycle-actions.tsx",
          "src/components/customers/customer-edit-card.tsx",
          "src/components/customers/add-customer-button.tsx",
          "src/components/login-form.tsx",
          "src/components/forgot-password-form.tsx",
          "src/components/reset-password-form.tsx",
        ],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/ui-components",
      include: [
        "src/components/page-header.tsx",
        "src/components/invoices/invoice-lifecycle-actions.tsx",
        "src/components/customers/customer-edit-card.tsx",
        "src/components/customers/add-customer-button.tsx",
        "src/components/login-form.tsx",
      ],
      exclude: ["**/*.test.tsx", "tests/**"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
