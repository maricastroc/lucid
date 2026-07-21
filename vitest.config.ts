import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Espelha o alias `@/*` → `src/*` do tsconfig, para que testes que exercitam código de
  // `src/app` (que usa `@/lucid`, `@/llm`, `@/report/...`) resolvam em runtime.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
