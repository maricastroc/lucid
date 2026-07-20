/**
 * API pública da Camada 1. Contrato: docs/ARQUITETURA.md §3.6.
 *
 * Deliberadamente NÃO reexporta nada de `src/lucid/probe/**` — a sonda é um import
 * explícito e separado (`src/lucid/probe/...`), nunca alcançável a partir deste barrel.
 *
 * `analyze` ainda não está implementado (Fase 1). Este arquivo existe na Fase 0 só para
 * fixar a forma da API pública e os tipos que ela expõe.
 */

export type {
  Categoria,
  Diagnostic,
  DiagnosticMeta,
  Document,
  Finding,
  LoadedData,
  Metricas,
  Pass,
  PassContext,
  Placar,
  PlacarCriterio,
  Sentence,
  Severity,
  Span,
  Token,
} from "./core/types";

export type { Config } from "./core/config";
export { DEFAULT_CONFIG, hashConfig } from "./core/config";

import type { Config } from "./core/config";
import type { Diagnostic } from "./core/types";

/**
 * Analisa um texto e retorna o diagnóstico da Camada 1. Síncrona, pura, determinística.
 * Implementação chega na Fase 1 — ver docs/ARQUITETURA.md §7 e §9.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura fixada pela Fase 1; corpo chega junto com analyzer.ts
export function analyze(_texto: string, _config?: Partial<Config>): Diagnostic {
  throw new Error("lucid: analyze() ainda não implementado (Fase 1 — ver docs/ARQUITETURA.md §9)");
}
