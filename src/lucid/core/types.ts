/**
 * Tipos centrais da Camada 1 (linter determinístico).
 * Contrato definido em docs/ARQUITETURA.md §3. Não importar nada de `src/lucid/probe/**`.
 */
import type { DataView } from "./data/types";

export type Severity = "info" | "warning" | "error";

export type Category = "lexical" | "syntactic" | "structural" | "metric";

/** Offset sempre no `Document.source` normalizado (NFC). `end` é exclusivo. */
export interface Span {
  start: number;
  end: number;
  text: string;
}

export interface Finding {
  /** id estável do critério, ex.: "long_sentence" */
  criterion: string;
  category: Category;
  /** subseção da ABNT NBR ISO 24495-1:2024, ex. "5.3.4" — nunca inventada */
  principle: string;
  span: Span;
  severity: Severity;
  /** presente só quando o mapeamento é mecanicamente único e seguro (I7) */
  suggestion?: string;
  /** true = a ferramenta se recusa a resolver; exige julgamento humano */
  requiresHuman: boolean;
  justification: string;
  /** proveniência opcional para debug/telemetria; não entra no snapshot canônico */
  meta?: Record<string, string | number | boolean>;
}

// --- Document (modelo compartilhado pelos passes) ---------------------------------

export interface Token {
  /** como aparece no source */
  text: string;
  /** caixa invariante, para lookups em léxicos */
  lower: string;
  start: number;
  end: number;
  /** false para pontuação, espaço ou número puro */
  isWord: boolean;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
  tokens: readonly Token[];
  wordCount: number;
}

/**
 * Bloco de texto entre linhas em branco — a camada estrutural MÍNIMA (Princípio 2). Só
 * parágrafos por ora: títulos/listas exigem convenção de marcação e ficam adiados (ADR-026).
 */
export interface Paragraph {
  text: string;
  start: number;
  end: number;
  sentences: readonly Sentence[];
  /** soma de `wordCount` das frases do parágrafo */
  wordCount: number;
}

/**
 * O modelo intermediário CANÔNICO da Camada 1 — o `AnnotatedDocument` do design (ver
 * docs/DESIGN-modelo-independente-de-formato.md). **Independente do formato de origem:** os
 * detectores dependem só deste tipo e nunca sabem se o texto veio de um editor, de um DOCX ou de
 * um PDF. `source` é sempre texto normalizado (NFC); todo offset é relativo a ele. Um importador
 * por formato é o único a produzi-lo (hoje só o de texto puro, `buildDocument`).
 */
export interface Document {
  readonly source: string;
  readonly sentences: readonly Sentence[];
  readonly tokens: readonly Token[];
  /** blocos estruturais — hoje só parágrafos; cresce (heading/list/…) de forma ADITIVA por formato */
  readonly paragraphs: readonly Paragraph[];
}

// --- Pass (unidade do pipeline) ----------------------------------------------------

export interface PassContext {
  readonly doc: Document;
  readonly config: import("./config").Config;
  /** visão escopada de dados do registry — só os `dataDeps` declarados por este pass */
  readonly data: DataView;
}

export interface Pass {
  /** id do critério (ex.: "long_sentence"). O core é neutro: o CONJUNTO válido é do locale (ADR-031). */
  readonly criterion: string;
  readonly category: Category;
  /** subseção-âncora do pass; um finding individual pode refinar via `principle` próprio */
  readonly principle: string;
  /**
   * Datasets (do data registry) de que este pass depende — declarativo, por id (string). Alimenta
   * o `dataHash` (proveniência) e a visão escopada de `ctx.data`. Os ids são do locale (ex.:
   * `"jargao.pt"`); o core não os enumera (ADR-031). Omitido = não usa dado.
   */
  readonly dataDeps?: readonly string[];
  run(ctx: PassContext): Finding[];
}

// --- Metrics e Score ---------------------------------------------------------------

export interface Metrics {
  fleschPt: number;
  words: number;
  sentences: number;
  /** total de sílabas do documento (soma sobre todos os tokens `isWord`) */
  syllables: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
}

export interface CriterionScore {
  criterion: string;
  principle: string;
  count: { info: number; warning: number; error: number };
  densityPer100Words: number;
}

export interface Score {
  byCriterion: CriterionScore[];
  totalFindings: number;
}

export interface DiagnosticMeta {
  lucidVersion: string;
  /** locale que produziu este diagnóstico — identidade contra mistura acidental (ADR-031) */
  localeId: string;
  configHash: string;
  dataHash: string;
  /** citação da norma do locale; para pt-BR, a adoção ABNT da ISO 24495-1 */
  standardVersion: string;
}

export interface Diagnostic {
  text: string;
  findings: Finding[];
  score: Score;
  metrics: Metrics;
  meta: DiagnosticMeta;
}
