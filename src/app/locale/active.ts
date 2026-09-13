import {
  assertLocaleBundle,
  analyzeDocumentWithLocale,
  analyzeWithLocale,
  buildCoverageReport,
  buildDocument as buildDocumentCore,
  criteriaWithoutObject,
  missingBlockKinds,
  sentenceSpanAt as sentenceSpanAtCore,
  type Block,
  type BlockKind,
  type Config,
  type ConfigSchema,
  type CoverageReport,
  type Diagnostic,
  type Document,
  type DocumentBuildServices,
  type LocaleBundle,
  type ReadabilityMetric,
  type Span,
} from "@/lucid";
import { clauseSplitPoints, localePtBR, type SplitPoint } from "@/locales/pt-BR";
import { localeEnUS } from "@/locales/en-US";

export const ANALYSIS_LOCALE_IDS = ["pt-BR", "en-US"] as const;

export type AnalysisLocaleId = (typeof ANALYSIS_LOCALE_IDS)[number];

export const DEFAULT_ANALYSIS_LOCALE_ID: AnalysisLocaleId = "pt-BR";

export interface ClauseGuidance {
  splitPoints(source: string, span: Span): SplitPoint[];
  readonly subordinators: RegExp;
}

export interface AnalysisLocale {
  readonly id: AnalysisLocaleId;
  readonly bundle: LocaleBundle;
  readonly documentServices: DocumentBuildServices;
  readonly criteria: readonly string[];
  readonly configSchema: ConfigSchema;
  readonly configSections: readonly string[];
  readonly vocabularySection: string | null;
  readonly defaultConfig: Config;
  readonly readability: ReadabilityMetric | undefined;
  canonical(criterion: string): string;
  readonly clauseGuidance: ClauseGuidance | null;
  readonly rewriteAvailable: boolean;
  readonly experimental: boolean;
  analyze(text: string, config?: Partial<Config>): Diagnostic;
  analyzeDocument(doc: Document, config?: Partial<Config>): Diagnostic;
  buildDocument(text: string): Document;
  silentCriteriaIn(blocks: readonly Block[]): string[];
  missingBlockKindsIn(blocks: readonly Block[]): BlockKind[];
  sentenceSpanAt(text: string, offset: number): Span;
  coverageReport(doc?: Document): CoverageReport;
}

const BUNDLES: Record<AnalysisLocaleId, LocaleBundle> = { "pt-BR": localePtBR, "en-US": localeEnUS };

const CLAUSE_GUIDANCE: Partial<Record<AnalysisLocaleId, ClauseGuidance>> = {
  "pt-BR": {
    splitPoints: (source, span) => clauseSplitPoints(source, span),
    subordinators: /\b(que|quando|porque|embora|cuj[ao]s?|onde|caso|conforme|porquanto|ainda que|de modo que)\b/gi,
  },
};

const REWRITE_ENGINES: ReadonlySet<AnalysisLocaleId> = new Set<AnalysisLocaleId>(["pt-BR"]);

const EXPERIMENTAL_LOCALES: ReadonlySet<AnalysisLocaleId> = new Set<AnalysisLocaleId>(["en-US"]);

export function isAnalysisLocaleId(value: unknown): value is AnalysisLocaleId {
  return typeof value === "string" && (ANALYSIS_LOCALE_IDS as readonly string[]).includes(value);
}

function facade(bundle: LocaleBundle, id: AnalysisLocaleId): AnalysisLocale {
  assertLocaleBundle(bundle);
  const documentServices: DocumentBuildServices = {
    segmentSentences: bundle.services.segmentSentences,
    abbreviations: bundle.data.abbreviations,
  };

  return {
    id,
    bundle,
    documentServices,
    criteria: bundle.criteria.ids,
    configSchema: bundle.configSchema,
    configSections: Object.keys(bundle.configSchema),
    vocabularySection:
      Object.keys(bundle.configSchema).find((s) => bundle.configSchema[s].role === "organization-vocabulary") ?? null,
    defaultConfig: bundle.config,
    readability: bundle.metrics.readability,
    canonical: (criterion) => bundle.criteria.canonical?.[criterion] ?? criterion,
    clauseGuidance: CLAUSE_GUIDANCE[id] ?? null,
    rewriteAvailable: REWRITE_ENGINES.has(id),
    experimental: EXPERIMENTAL_LOCALES.has(id),
    analyze: (text, config) => analyzeWithLocale(text, bundle, config),
    analyzeDocument: (doc, config) => analyzeDocumentWithLocale(doc, bundle, config),
    buildDocument: (text) => buildDocumentCore(text, documentServices),
    silentCriteriaIn: (blocks) => criteriaWithoutObject(bundle.passes, blocks),
    missingBlockKindsIn: (blocks) => missingBlockKinds(bundle.passes, blocks),
    sentenceSpanAt: (text, offset) => sentenceSpanAtCore(text, offset, bundle.data.abbreviations),
    coverageReport: (doc) =>
      buildCoverageReport(bundle.clauses, bundle.taxonomy, doc ? { passes: bundle.passes, doc } : {}),
  };
}

const FACADES: Record<AnalysisLocaleId, AnalysisLocale> = Object.fromEntries(
  ANALYSIS_LOCALE_IDS.map((id) => [id, facade(BUNDLES[id], id)]),
) as Record<AnalysisLocaleId, AnalysisLocale>;

export function analysisLocale(id: AnalysisLocaleId): AnalysisLocale {
  return FACADES[id];
}

export function requireAnalysisLocale(id: string): AnalysisLocale {
  if (!isAnalysisLocaleId(id)) {
    throw new Error(`nenhum motor de análise registrado para o locale "${id}".`);
  }
  return FACADES[id];
}
