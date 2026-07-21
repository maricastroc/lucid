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

export type { CriterionId } from "./core/criteria";
export { CRITERION_IDS, isCriterionId } from "./core/criteria";

export type { Config } from "./core/config";
export { DEFAULT_CONFIG, hashConfig } from "./core/config";

export { analyze } from "./core/analyzer";

/**
 * Tier 2 — ação estrutural assistida (determinística, zero rede). Funções PURAS que a UI
 * consome para oferecer andaimes sobre findings que exigem decisão humana; nunca aplicam
 * nada sozinhas nem inventam conteúdo. Ver ADR-012/013.
 */
export { clauseSplitPoints, applySplitAt } from "./core/actions/split-sentence";
export type { SplitPoint, SplitKind } from "./core/actions/split-sentence";
export { passiveScaffold } from "./core/actions/passive-scaffold";
export type { PassiveScaffold } from "./core/actions/passive-scaffold";
export { sentenceSpanAt } from "./core/document/locate";
