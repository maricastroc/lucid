/**
 * Helpers de teste ligados ao locale pt-BR (ADR-031). Depois que os serviços de documento e
 * métrica passaram a ser INJETADOS pelo locale (o core não tem mais default PT), os testes de
 * unidade que constroem documento/métrica diretamente usam estes wrappers pt-BR.
 */
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
