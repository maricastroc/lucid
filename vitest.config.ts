import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": src } },
  test: {
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        test: {
          name: "engine",
          include: ["test/**/*.test.ts", "src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          include: ["test/ui/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./test/ui/support/setup.ts"],
        },
      },
    ],
  },
});
