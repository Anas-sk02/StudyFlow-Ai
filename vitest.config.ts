import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // unit tests only — Playwright owns everything under tests/e2e
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/focus.ts", "lib/validations.ts"],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      // mirror the "@/*" -> "./*" path alias from tsconfig.json
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
