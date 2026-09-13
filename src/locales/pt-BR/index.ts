import { DEFAULT_CONFIG, PT_CONFIG_SCHEMA, type PtConfig } from "./config";
import type { Diagnostic, Pass } from "@/lucid/core/types";
import type { LocaleBundle, LocaleDataRegistry, ReadabilityMetric } from "@/lucid/core/contracts/locale";
import { asLocaleId } from "@/lucid/core/contracts/locale";
import type { Block, BlockKind, Document, Span } from "@/lucid/core/types";
import { analyzeDocumentWithLocale, analyzeWithLocale } from "@/lucid/core/analyzer";
import { buildCoverageReport, criteriaWithoutObject, missingBlockKinds } from "@/lucid/core/coverage/build";
import type { CoverageReport } from "@/lucid/core/coverage/types";
import { segmentSentences } from "@/lucid/core/document/segment-sentences";
import { buildDocument as buildDocumentCore } from "@/lucid/core/document/model";
import { sentenceSpanAt as sentenceSpanAtCore } from "@/lucid/core/document/locate";
import { CRITERION_IDS, PT_CANONICAL } from "./criteria";
import { CRITERION_TAXONOMY } from "./taxonomy";
import { CLAUSE_TREE } from "./clauses";
import { PASSES } from "./passes/registry";
import { countSyllables } from "./services/syllables";
import { calculateFleschPt, interpretFleschPt, READABILITY_REFERENCE_RANGE } from "./readability/flesch-pt";
import { createCohesion } from "./metrics/cohesion";
import { DOCUMENT_DATASETS, REGISTRY_PT, getPrepared } from "./datasets/registry";
import type { DatasetId } from "./datasets/types";

export const ptReadability: ReadabilityMetric = {
  id: "flesch-pt-martins-1996",
  name: "Flesch-PT",
  referenceRange: READABILITY_REFERENCE_RANGE,
  calculate: ({ wordsPerSentence, syllablesPerWord }) => calculateFleschPt(wordsPerSentence, syllablesPerWord),
  interpret: (metrics) => interpretFleschPt(metrics),
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

export { READABILITY_REFERENCE_RANGE } from "./readability/flesch-pt";

export const localePtBR: LocaleBundle<PtConfig> = {
  id: asLocaleId("pt-BR"),
  standardVersion: "ABNT NBR ISO 24495-1:2024",
  passes: PASSES,
  config: DEFAULT_CONFIG,
  configSchema: PT_CONFIG_SCHEMA,
  services: { segmentSentences },
  metrics: { countSyllables, readability: ptReadability, cohesion, dataDeps: ["stopwords.pt", "conectivos.pt"] },
  data,
  criteria: { ids: CRITERION_IDS, canonical: PT_CANONICAL },
  taxonomy: CRITERION_TAXONOMY,
  clauses: CLAUSE_TREE,
};

export function analyze(text: string, configOverrides?: Partial<PtConfig>): Diagnostic {
  return analyzeWithLocale(text, localePtBR, configOverrides);
}

export function analyzeDocument(doc: Document, configOverrides?: Partial<PtConfig>): Diagnostic {
  return analyzeDocumentWithLocale(doc, localePtBR, configOverrides);
}

export function analyzeWithPasses(
  text: string,
  passes: readonly Pass<PtConfig>[],
  configOverrides?: Partial<PtConfig>,
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

export function coverageReport(doc?: Document): CoverageReport {
  return buildCoverageReport(localePtBR.clauses, localePtBR.taxonomy, doc ? { passes: localePtBR.passes, doc } : {});
}

export function silentCriteriaIn(blocks: readonly Block[]): string[] {
  return criteriaWithoutObject(localePtBR.passes, blocks);
}

export function missingBlockKindsIn(blocks: readonly Block[]): BlockKind[] {
  return missingBlockKinds(localePtBR.passes, blocks);
}

export { countPii, isValidCnpj, isValidCpf } from "./privacy/pii";
export type { PiiCount, PiiKind } from "./privacy/pii";

export { CRITERION_IDS, isCriterionId } from "./criteria";
export type { CriterionId } from "./criteria";

export { clauseSplitPoints } from "./actions/split-sentence";
export type { SplitKind, SplitPoint } from "./actions/split-sentence";
export { passiveScaffold } from "./actions/passive-scaffold";
export type { PassiveScaffold } from "./actions/passive-scaffold";

export { DEFAULT_CONFIG, PT_CONFIG_SCHEMA } from "./config";
export type { PtConfig } from "./config";
