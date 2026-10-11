import { defineConfig } from "vitest/config";

import { vitestResolve } from "./vitest.resolve.mjs";

export default defineConfig({
  resolve: vitestResolve,
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/modules/auth-onboarding/**/*.test.ts"],
    server: {
      deps: {
        inline: ["src/app/api/me/route.ts", "src/app/api/onboarding/route.ts"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage/auth-onboarding",
      include: [
        "src/lib/auth-user.ts",
        "src/app/api/onboarding/route.ts",
        "src/app/api/me/route.ts",
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
