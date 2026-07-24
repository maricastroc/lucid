export type {
  Block,
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
  Score,
  Sentence,
  Severity,
  Span,
  Token,
} from "./core/types";

export type { CriterionId } from "../locales/pt-BR/criteria";
export { CRITERION_IDS, isCriterionId } from "../locales/pt-BR/criteria";

export type { Config } from "./core/config";
export { DEFAULT_CONFIG, hashConfig } from "./core/config";

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
export { buildStructuredDocument } from "./core/document/structured";
export type { RawBlock } from "./core/document/structured";

export { analyze, analyzeDocument, analyzeWithPasses, localePtBR, ptDocumentServices } from "../locales/pt-BR";

export { clauseSplitPoints } from "../locales/pt-BR/actions/split-sentence";
export type { SplitPoint, SplitKind } from "../locales/pt-BR/actions/split-sentence";
export { passiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export type { PassiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export { sentenceSpanAt } from "../locales/pt-BR";
