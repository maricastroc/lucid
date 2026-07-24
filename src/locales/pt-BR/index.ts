import type { Config } from "@/lucid/core/config";
import type { Diagnostic, Pass } from "@/lucid/core/types";
import type { LocaleBundle, LocaleDataRegistry, ReadabilityMetric } from "@/lucid/core/contracts/locale";
import { asLocaleId } from "@/lucid/core/contracts/locale";
import type { Document, Span } from "@/lucid/core/types";
import { analyzeDocumentWithLocale, analyzeWithLocale } from "@/lucid/core/analyzer";
import { DEFAULT_CONFIG } from "@/lucid/core/config";
import { segmentSentences } from "@/lucid/core/document/segment-sentences";
import { buildDocument as buildDocumentCore } from "@/lucid/core/document/model";
import { sentenceSpanAt as sentenceSpanAtCore } from "@/lucid/core/document/locate";
import { CRITERION_IDS } from "./criteria";
import { CRITERION_TAXONOMY } from "./taxonomy";
import { PASSES } from "./passes/registry";
import { countSyllables } from "./services/syllables";
import { calculateFleschPt } from "./readability/flesch-pt";
import { createCohesion } from "./metrics/cohesion";
import { DOCUMENT_DATASETS, REGISTRY_PT, getPrepared } from "./datasets/registry";
import type { DatasetId } from "./datasets/types";

const readability: ReadabilityMetric = {
  id: "flesch-pt-martins-1996",
  calculate: ({ wordsPerSentence, syllablesPerWord }) => calculateFleschPt(wordsPerSentence, syllablesPerWord),
};

const cohesion = createCohesion({
  stopwords: getPrepared("stopwords.pt"),
  connectives: getPrepared("conectivos.pt"),
});

const data: LocaleDataRegistry = {
  createDataView: (deps) => REGISTRY_PT.createDataView(deps as DatasetId[]),
  documentDatasets: DOCUMENT_DATASETS,
  dataHashFor: (ids) => REGISTRY_PT.dataHashFor([...ids] as DatasetId[]),
  abbreviations: getPrepared("abreviacoes.pt"),
};

export const localePtBR: LocaleBundle = {
  id: asLocaleId("pt-BR"),
  standardVersion: "ABNT NBR ISO 24495-1:2024",
  passes: PASSES,
  config: DEFAULT_CONFIG,
  services: { segmentSentences },
  metrics: { countSyllables, readability, cohesion, dataDeps: ["stopwords.pt", "conectivos.pt"] },
  data,
  criteria: { ids: CRITERION_IDS },
  taxonomy: CRITERION_TAXONOMY,
};

export function analyze(text: string, configOverrides?: Partial<Config>): Diagnostic {
  return analyzeWithLocale(text, localePtBR, configOverrides);
}

export function analyzeDocument(doc: Document, configOverrides?: Partial<Config>): Diagnostic {
  return analyzeDocumentWithLocale(doc, localePtBR, configOverrides);
}

export function analyzeWithPasses(
  text: string,
  passes: readonly Pass[],
  configOverrides?: Partial<Config>,
): Diagnostic {
  return analyzeWithLocale(text, { ...localePtBR, passes }, configOverrides);
}

export const ptDocumentServices = {
  segmentSentences: localePtBR.services.segmentSentences,
  abbreviations: localePtBR.data.abbreviations,
};

export function buildDocument(text: string): Document {
  return buildDocumentCore(text, ptDocumentServices);
}

export function sentenceSpanAt(text: string, offset: number): Span {
  return sentenceSpanAtCore(text, offset, localePtBR.data.abbreviations);
}
