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
  LoadedData,
  Metrics,
  Pass,
  PassContext,
  Score,
  Sentence,
  Severity,
  Span,
  Token,
} from "./core/types";

export type { Config } from "./core/config";
export { DEFAULT_CONFIG, hashConfig } from "./core/config";

export { analyze } from "./core/analyzer";
