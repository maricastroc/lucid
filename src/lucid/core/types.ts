/**
 * Tipos centrais da Camada 1 (linter determinístico).
 * Contrato definido em docs/ARQUITETURA.md §3. Não importar nada de `src/lucid/probe/**`.
 */

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

export interface Document {
  readonly source: string;
  readonly sentences: readonly Sentence[];
  readonly tokens: readonly Token[];
}

// --- Pass (unidade do pipeline) ----------------------------------------------------

export interface LoadedData {
  readonly [dataset: string]: unknown;
}

export interface PassContext {
  readonly doc: Document;
  readonly config: import("./config").Config;
  readonly data: LoadedData;
}

export interface Pass {
  readonly criterion: string;
  readonly category: Category;
  /** subseção-âncora do pass; um finding individual pode refinar via `principle` próprio */
  readonly principle: string;
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

/**
 * Deliberadamente sem "nota geral" nem "aprovado". O placar mede, não aprova.
 */
export interface Score {
  byCriterion: CriterionScore[];
  totalFindings: number;
}

// --- Diagnostic (saída da Camada 1) -------------------------------------------------

export interface DiagnosticMeta {
  lucidVersion: string;
  /** hash estável da Config efetiva, para integridade do snapshot */
  configHash: string;
  standardVersion: "ABNT NBR ISO 24495-1:2024";
}

export interface Diagnostic {
  /** === Document.source (original normalizado, intacto) */
  text: string;
  /** ordenados por (start, end, criterion, principle) */
  findings: Finding[];
  score: Score;
  metrics: Metrics;
  meta: DiagnosticMeta;
}
