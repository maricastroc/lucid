import type { PtConfig as Config } from "../../src/locales/pt-BR";
import { DEFAULT_CONFIG } from "../../src/locales/pt-BR";
import type { Document, Metrics } from "../../src/lucid/core/types";
import { buildDocument as buildDocumentCore } from "../../src/lucid/core/document/model";
import { segmentSentences as segmentSentencesCore } from "../../src/lucid/core/document/segment-sentences";
import { runMetrics as runMetricsCore, type MetricServices } from "../../src/lucid/core/metrics";
import { localePtBR, ptReadability } from "../../src/locales/pt-BR";

export const ptAbbreviations = localePtBR.data.abbreviations;

const ptMetricServices: MetricServices = {
  countSyllables: localePtBR.metrics.countSyllables,
  readability: (input) => ptReadability.calculate(input),
  cohesion: (doc) => localePtBR.metrics.cohesion!(doc),
};

export function buildDocument(text: string): Document {
  return buildDocumentCore(text, {
    segmentSentences: localePtBR.services.segmentSentences,
    abbreviations: ptAbbreviations,
  });
}

export function segmentSentences(source: string): ReturnType<typeof segmentSentencesCore> {
  return segmentSentencesCore(source, ptAbbreviations);
}

export function runMetrics(doc: Document, config: Config = DEFAULT_CONFIG): Metrics {
  return runMetricsCore(doc, config, ptMetricServices);
}
