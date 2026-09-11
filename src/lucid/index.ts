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
  TableBlock,
  TableCellBlock,
  TableRowBlock,
  Token,
} from "./core/types";

export type {
  Config,
  ConfigDeviation,
  ConfigField,
  ConfigSchema,
  ConfigSection,
  ConfigSectionRole,
  ConfigSectionSchema,
  ConfigValue,
  OrgTerm,
  ThresholdBasis,
  ThresholdStatus,
} from "./core/config";
export { configDeviations, configSections, hashConfig, isDefaultConfig, pickSections } from "./core/config";
export { assertLocaleBundle } from "./core/contracts/validate";
export { stableHash, stableStringify } from "./core/hash";

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
export { readabilityReadingOf } from "./core/metrics";
export { buildDocument } from "./core/document/model";
export type { DocumentBuildServices } from "./core/document/model";
export { sentenceSpanAt } from "./core/document/locate";
export {
  affixSplice,
  buildStructuredDocument,
  isRawBlock,
  normalizeListItem,
  rawUnitTexts,
  spliceStructuredDocument,
  toRawBlocks,
} from "./core/document/structured";
export type {
  RawBlock,
  RawListItem,
  StoredListItem,
  RawTableCell,
  RawTableRow,
  SpliceRefusal,
  StructuredSplice,
  TextSplice,
} from "./core/document/structured";
export { cellPositions, resolveTableGrid } from "./core/document/table-grid";
export type { GridSlot, ResolvedGrid } from "./core/document/table-grid";

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
