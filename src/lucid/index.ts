/**
 * API pública da Camada 1. Contrato: docs/ARQUITETURA.md §3.6.
 *
 * Deliberadamente NÃO reexporta nada de `src/lucid/probe/**` — a sonda é um import
 * explícito e separado (`src/lucid/probe/...`), nunca alcançável a partir deste barrel.
 */

export type {
  Category,
  CriterionScore,
  Diagnostic,
  DiagnosticMeta,
  Document,
  Finding,
  Metrics,
  Pass,
  PassContext,
  Score,
  Sentence,
  Severity,
  Span,
  Token,
} from "./core/types";

/** Critérios do locale default (pt-BR). O conjunto é do locale, não do core (ADR-031). */
export type { CriterionId } from "../locales/pt-BR/criteria";
export { CRITERION_IDS, isCriterionId } from "../locales/pt-BR/criteria";

export type { Config } from "./core/config";
export { DEFAULT_CONFIG, hashConfig } from "./core/config";

/** Contrato de locale (ADR-031) — a fronteira de extensibilidade por idioma. */
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

/** API NEUTRA de análise: recebe o locale explicitamente (sem estado global). */
export { analyzeWithLocale, createAnalyzer, sortFindings } from "./core/analyzer";

/**
 * Conveniência: o Lucid com o locale pt-BR ligado. `analyze(text)` é a API compatível de sempre;
 * mora no locale (não no core). Para outro locale, use `analyzeWithLocale`/`createAnalyzer`.
 */
export { analyze, analyzeWithPasses, localePtBR } from "../locales/pt-BR";

/**
 * Tier 2 — ação estrutural assistida (determinística, zero rede). Funções PURAS que a UI
 * consome para oferecer andaimes sobre findings que exigem decisão humana; nunca aplicam
 * nada sozinhas nem inventam conteúdo. Ver ADR-012/013.
 */
export { clauseSplitPoints, applySplitAt } from "../locales/pt-BR/actions/split-sentence";
export type { SplitPoint, SplitKind } from "../locales/pt-BR/actions/split-sentence";
export { passiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export type { PassiveScaffold } from "../locales/pt-BR/actions/passive-scaffold";
export { sentenceSpanAt } from "../locales/pt-BR";
