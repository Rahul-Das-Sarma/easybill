import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.ts";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/modules/invoice-mutation/**/*.test.ts"],
    server: {
      deps: {
        inline: [
          "src/lib/invoice-mutation.ts",
          "src/lib/invoice-mutation-schema.ts",
        ],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/invoice-mutation",
      include: [
        "src/lib/invoice-mutation.ts",
        "src/lib/invoice-mutation-schema.ts",
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
