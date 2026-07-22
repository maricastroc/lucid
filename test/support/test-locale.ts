/**
 * Locale SINTÉTICO, exclusivo de teste (ADR-031). Não é um idioma, não aparece na UI, não é
 * divulgado — existe só para PROVAR que a arquitetura neutra do core aceita outra implementação de
 * `LocaleBundle` sem adicionar inglês de verdade. Tudo aqui é mínimo e determinístico:
 *   · tokenização/segmentação: reusa os serviços neutros do core;
 *   · 1 pass artificial que marca palavras de um dataset minúsculo;
 *   · 1 dataset pequeno construído pelo mecanismo neutro `createRegistry`;
 *   · uma métrica de legibilidade FALSA e constante (42).
 */
import type { LocaleBundle, LocaleDataRegistry } from "../../src/lucid/core/contracts/locale";
import { asLocaleId } from "../../src/lucid/core/contracts/locale";
import type { Finding, Pass } from "../../src/lucid/core/types";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { segmentSentences } from "../../src/lucid/core/document/segment-sentences";
import { createRegistry } from "../../src/lucid/core/data/registry";

const TEST_DATASET = "test-words.tl";

const registry = createRegistry({
  [TEST_DATASET]: {
    raw: { words: ["foo", "bar"] },
    prepare: (r) => new Set((r as { words: string[] }).words),
    provenance: "sintético (somente teste)",
  },
});

const testMarkerPass: Pass = {
  criterion: "test_marker",
  category: "lexical",
  principle: "0.0",
  dataDeps: [TEST_DATASET],
  run(ctx) {
    const triggers = ctx.data.get<ReadonlySet<string>>(TEST_DATASET);
    const findings: Finding[] = [];
    for (const token of ctx.doc.tokens) {
      if (token.isWord && triggers.has(token.lower)) {
        findings.push({
          criterion: "test_marker",
          category: "lexical",
          principle: "0.0",
          span: { start: token.start, end: token.end, text: token.text },
          severity: "info",
          requiresHuman: true,
          justification: "marcador de teste",
        });
      }
    }
    return findings;
  },
};

const data: LocaleDataRegistry = {
  createDataView: (deps) => registry.createDataView(deps),
  documentDatasets: [],
  dataHashFor: (ids) => registry.dataHashFor(ids),
  abbreviations: new Set<string>(),
};

export const testLocale: LocaleBundle = {
  id: asLocaleId("test-LOCALE"),
  standardVersion: "TEST-STD",
  passes: [testMarkerPass],
  config: DEFAULT_CONFIG,
  services: { segmentSentences },
  metrics: {
    countSyllables: () => 1,
    readability: { id: "fake-constant-42", calculate: () => 42 },
  },
  data,
  criteria: { ids: ["test_marker"] },
};
