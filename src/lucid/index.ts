export type {
  Block,
  Category,
  CriterionScore,
  Diagnostic,
  DiagnosticMeta,
  Document,
  Finding,
  HeadingBlock,
  ListBlock,
  ListItemBlock,
  ParagraphBlock,
  Metrics,
  Pass,
  PassContext,
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

export { clauseSplitPoints, applySplitAt } from "../locales/pt-BR/actions/split-sentence";
export type { SplitPoint, SplitKind } from "../locales/pt-BR/actions/split-sentence";
export { passiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export type { PassiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export { passiveToActive, applyPassiveWithAgent } from "../locales/pt-BR/actions/passive-to-active";
export type { PassiveRewrite } from "../locales/pt-BR/actions/passive-to-active";
export { sentenceSpanAt } from "../locales/pt-BR";
