import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Shared `@/` alias for all Vitest configs (replaces vite-tsconfig-paths). */
export const vitestResolve = {
  alias: {
    "@": path.resolve(root, "src"),
  },
};
