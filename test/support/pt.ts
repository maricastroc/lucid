import type { Config } from "../../src/lucid/core/config";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import type { Document, Metrics } from "../../src/lucid/core/types";
import { buildDocument as buildDocumentCore } from "../../src/lucid/core/document/model";
import { segmentSentences as segmentSentencesCore } from "../../src/lucid/core/document/segment-sentences";
import { runMetrics as runMetricsCore, type MetricServices } from "../../src/lucid/core/metrics";
import { localePtBR } from "../../src/locales/pt-BR";

export const ptAbbreviations = localePtBR.data.abbreviations;

const ptMetricServices: MetricServices = {
  countSyllables: localePtBR.metrics.countSyllables,
  readability: (input) => localePtBR.metrics.readability.calculate(input),
  cohesion: (doc) => localePtBR.metrics.cohesion(doc),
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
