import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.ts";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/modules/customers/**/*.test.ts"],
    server: {
      deps: {
        inline: [
          "src/app/api/customers/route.ts",
          "src/app/api/customers/search/route.ts",
          "src/app/api/customers/[id]/route.ts",
        ],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/customers",
      include: [
        "src/app/api/customers/route.ts",
        "src/app/api/customers/search/route.ts",
        "src/app/api/customers/**/route.ts",
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
