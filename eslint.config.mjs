import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // I4 (docs/ARQUITETURA.md §1): a Camada 1 é 100% determinística. Nenhuma dessas
    // fontes de não-determinismo pode viver em `src/lucid/core/**`.
    files: ["src/lucid/core/**/*.ts", "src/lucid/core/**/*.tsx"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "I4: Date.now()/new Date() é não-determinístico. Não usar em src/lucid/core." },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "I4: Math.random() é não-determinístico. Não usar em src/lucid/core.",
        },
        {
          object: "Date",
          property: "now",
          message: "I4: Date.now() é não-determinístico. Não usar em src/lucid/core.",
        },
        {
          property: "toLocaleLowerCase",
          message: "I4: toLocaleLowerCase() depende do locale de execução. Usar toLowerCase() (caixa invariante).",
        },
        {
          property: "toLocaleUpperCase",
          message: "I4: toLocaleUpperCase() depende do locale de execução. Usar toUpperCase() (caixa invariante).",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "I4: new Date() sem argumentos é não-determinístico. Não usar em src/lucid/core.",
        },
      ],
    },
  },
]);

export default eslintConfig;
