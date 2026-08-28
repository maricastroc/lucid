export type {
  Block,
  BlockKind,
  Category,
  CohesionMetrics,
  ConnectiveClass,
  CriterionScore,
  CriterionSource,
  CriterionTaxonomy,
  CriterionTaxonomyEntry,
  Diagnostic,
  DiagnosticMeta,
  Document,
  Finding,
  HeadingBlock,
  ListBlock,
  ListItemBlock,
  NormativeReference,
  ParagraphBlock,
  Metrics,
  Pass,
  PassContext,
  PassFinding,
  PrincipleGroup,
  ReadabilityAnomaly,
  ReadabilityBand,
  ReadabilityReading,
  ReadabilityScalePosition,
  ReadabilityUnmeasurableCause,
  Score,
  Sentence,
  Severity,
  Span,
  Token,
} from "./core/types";

export type { CriterionId } from "../locales/pt-BR/criteria";
export { CRITERION_IDS, isCriterionId } from "../locales/pt-BR/criteria";

export type { Config, ConfigDeviation, ConfigValue } from "./core/config";
export { configDeviations, DEFAULT_CONFIG, hashConfig, isDefaultConfig } from "./core/config";

export type {
  LocaleBundle,
  LocaleId,
  DocumentServices,
  ReadabilityMetric,
  MetricServices,
  LocaleDataRegistry,
  LocaleCriteria,
} from "./core/contracts/locale";
export { asLocaleId } from "./core/contracts/locale";

export { analyzeDocumentWithLocale, analyzeWithLocale, createAnalyzer, sortFindings } from "./core/analyzer";
export { buildStructuredDocument, spliceStructuredDocument, toRawBlocks } from "./core/document/structured";
export type { RawBlock, SpliceRefusal, StructuredSplice } from "./core/document/structured";

export { buildCoverageReport, criteriaWithoutObject, missingBlockKinds } from "./core/coverage/build";
export type { CoverageOptions } from "./core/coverage/build";
export type {
  ClauseCoverage,
  ClauseLimit,
  ClauseLimitKind,
  ClauseNode,
  ClauseStatus,
  ClauseTree,
  CoverageReport,
  CoverageScope,
  OutsideStandardCriterion,
} from "./core/coverage/types";

export { checkBriefing, isBriefingDeclared } from "./core/briefing/check";
export { EMPTY_BRIEFING } from "./core/briefing/types";
export type { BriefingCheck, BriefingCoverage, ReaderBriefing } from "./core/briefing/types";

export { countPii, isValidCnpj, isValidCpf } from "../locales/pt-BR/privacy/pii";
export type { PiiCount, PiiKind } from "../locales/pt-BR/privacy/pii";

export {
  analyze,
  analyzeDocument,
  analyzeWithPasses,
  buildDocument,
  coverageReport,
  localePtBR,
  missingBlockKindsIn,
  silentCriteriaIn,
  ptDocumentServices,
  READABILITY_REFERENCE_RANGE,
} from "../locales/pt-BR";

export { clauseSplitPoints } from "../locales/pt-BR/actions/split-sentence";
export type { SplitPoint, SplitKind } from "../locales/pt-BR/actions/split-sentence";
export { passiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export type { PassiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export { sentenceSpanAt } from "../locales/pt-BR";
