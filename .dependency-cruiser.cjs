/**
 * Cerca arquitetural (I1 — docs/ARQUITETURA.md §1).
 *
 *   - `src/lucid/core/**` nunca importa de `src/lucid/probe/**`.
 *   - `src/lucid/core/**` nunca importa `react`, `next`, nem qualquer módulo de I/O
 *     de rede (fetch/http/https/node:http/node:https).
 *   - `src/lucid/core/**` nunca importa de `src/report/**` nem `src/app/**` (a
 *     dependência é sempre na direção contrária).
 *
 * `src/report/**` é o único lugar autorizado a importar de `core` e `probe` ao mesmo
 * tempo — por isso não aparece nas regras "forbidden" abaixo.
 */
module.exports = {
  forbidden: [
    {
      name: "core-nao-importa-probe",
      severity: "error",
      comment: "Camada 1 (core) não pode importar da Camada 2 (probe). Ver CLAUDE.md — cerca dura entre as camadas.",
      from: { path: "^src/lucid/core" },
      to: { path: "^src/lucid/probe" },
    },
    {
      name: "core-sem-framework",
      severity: "error",
      comment: "Camada 1 é pura: sem React/Next. UI consome a lib, nunca o contrário.",
      from: { path: "^src/lucid/core" },
      to: { path: "^(react|react-dom|next)($|/)" },
    },
    {
      name: "core-sem-rede",
      severity: "error",
      comment: "Camada 1 é zero-rede. Nenhuma chamada de rede pode viver em core.",
      from: { path: "^src/lucid/core" },
      to: { path: "^(node:)?(https?)$" },
    },
    {
      name: "core-nao-importa-report-ou-app",
      severity: "error",
      comment: "A dependência é sempre report/app -> lucid, nunca o contrário.",
      from: { path: "^src/lucid/core" },
      to: { path: "^src/(report|app)" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    doNotFollow: {
      path: "node_modules",
    },
  },
};
