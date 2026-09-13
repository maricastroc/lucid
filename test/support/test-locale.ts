import type { LocaleBundle, LocaleDataRegistry } from "../../src/lucid/core/contracts/locale";
import { asLocaleId } from "../../src/lucid/core/contracts/locale";
import type { PassFinding, Pass } from "../../src/lucid/core/types";
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
  dataDeps: [TEST_DATASET],
  run(ctx) {
    const triggers = ctx.data.get<ReadonlySet<string>>(TEST_DATASET);
    const findings: PassFinding[] = [];
    for (const token of ctx.doc.tokens) {
      if (token.isWord && triggers.has(token.lower)) {
        findings.push({
          criterion: "test_marker",
          category: "lexical",
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
  abbreviations: { blocking: new Set<string>(), units: new Set<string>() },
};

const emptyCohesion = () => ({
  referentialOverlap: 0,
  adjacentGapRatio: 0,
  connectivesPer100Words: 0,
  connectivesByClass: { additive: 0, adversative: 0, causal: 0, temporal: 0, conclusive: 0 },
});

export const testLocale: LocaleBundle = {
  id: asLocaleId("test-LOCALE"),
  standardVersion: "TEST-STD",
  passes: [testMarkerPass],
  config: { metrics: { decimalPlaces: 1 } },
  configSchema: { metrics: { criterion: null } },
  services: { segmentSentences },
  metrics: {
    countSyllables: () => 1,
    readability: {
      id: "fake-constant-42",
      name: "Fake-42",
      referenceRange: { min: 0, max: 100 },
      calculate: () => 42,
      interpret: (metrics) =>
        metrics.readability === null
          ? { kind: "unmeasurable", cause: metrics.words === 0 ? "no_words" : "no_sentences" }
          : {
              kind: "measured",
              value: metrics.readability,
              position: "in_range",
              band: { id: "test_band", min: 0, max: 100, label: "faixa de teste" },
              anomalies: [],
            },
    },
    cohesion: emptyCohesion,
  },
  data,
  criteria: { ids: ["test_marker"] },
  taxonomy: { test_marker: { source: "structural-heuristic", principleGroup: "understandable" } },
  clauses: {
    standard: "TEST-STD",
    referenceName: "TEST-STD",
    transcription: "árvore sintética (somente teste)",
    exhaustive: false,
    nodes: [],
  },
};

export const metricLessLocale: LocaleBundle = {
  ...testLocale,
  id: asLocaleId("no-METRICS"),
  metrics: {},
};
