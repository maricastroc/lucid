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
      name: "core-nao-importa-llm",
      severity: "error",
      comment:
        "Camada 1 é zero-rede: não pode importar a infra de LLM (src/llm faz fetch). " +
        "src/llm é a única casa de rede compartilhada; só report e probe a usam.",
      from: { path: "^src/lucid/core" },
      to: { path: "^src/llm" },
    },
    {
      name: "core-nao-importa-report-ou-app",
      severity: "error",
      comment: "A dependência é sempre report/app -> lucid, nunca o contrário.",
      from: { path: "^src/lucid/core" },
      to: { path: "^src/(report|app)" },
    },
    {
      name: "core-nao-importa-locale",
      severity: "error",
      comment:
        "Fronteira de locale (ADR-031): o core é NEUTRO de idioma e nunca importa uma implementação " +
        "de locale. A dependência é sempre locale -> core. O default pt-BR é composto no barrel " +
        "(src/lucid/index.ts), não no core.",
      from: { path: "^src/lucid/core" },
      to: { path: "^src/locales" },
    },
    {
      name: "core-e-locale-nao-importam-importer",
      severity: "error",
      comment:
        "Fronteira de formato (ADR-039): importadores (src/importers) usam biblioteca (mammoth/pdfjs) " +
        "e são o único lugar ciente do formato. A dependência é sempre importer/app -> lucid, nunca o " +
        "contrário — a Camada 1 continua zero-dep de parsing.",
      from: { path: "^src/(lucid/core|locales)" },
      to: { path: "^src/importers" },
    },
    {
      name: "locale-e-puro-como-o-core",
      severity: "error",
      comment:
        "Um locale é Camada 1: mesma pureza do core — zero probe, zero rede/LLM, zero report/app, " +
        "zero React/Next. Ele FORNECE dados/passes/prompts; quem os executa (probe/report) importa " +
        "o locale, nunca o contrário.",
      from: { path: "^src/locales" },
      to: { path: "^(src/lucid/probe|src/report|src/app|src/llm|react|react-dom|next)($|/)" },
    },
    {
      name: "locale-sem-rede",
      severity: "error",
      comment: "Um locale (Camada 1) é zero-rede.",
      from: { path: "^src/locales" },
      to: { path: "^(node:)?(https?)$" },
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
