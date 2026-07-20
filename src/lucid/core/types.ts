/**
 * Tipos centrais da Camada 1 (linter determinístico).
 * Contrato definido em docs/ARQUITETURA.md §3. Não importar nada de `src/lucid/probe/**`.
 */

export type Severity = "info" | "alerta" | "erro";

export type Categoria = "lexical" | "sintatico" | "estrutural" | "metrico";

/** Offset sempre no `Document.source` normalizado (NFC). `end` é exclusivo. */
export interface Span {
  start: number;
  end: number;
  texto: string;
}

export interface Finding {
  /** id estável do critério, ex.: "frase_longa" */
  criterio: string;
  categoria: Categoria;
  /** subseção da ABNT NBR ISO 24495-1:2024, ex. "5.3.4" — nunca inventada */
  principio: string;
  trecho: Span;
  severidade: Severity;
  /** presente só quando o mapeamento é mecanicamente único e seguro (I7) */
  sugestao?: string;
  /** true = a ferramenta se recusa a resolver; exige julgamento humano */
  requiresHuman: boolean;
  justificativa: string;
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
  readonly criterio: string;
  readonly categoria: Categoria;
  /** subseção-âncora do pass; um finding individual pode refinar via `principio` próprio */
  readonly principio: string;
  run(ctx: PassContext): Finding[];
}

// --- Metricas e Placar ---------------------------------------------------------------

export interface Metricas {
  fleschPt: number;
  palavras: number;
  frases: number;
  /** total de sílabas do documento (soma sobre todos os tokens `isWord`) */
  silabas: number;
  palavrasPorFrase: number;
  silabasPorPalavra: number;
}

export interface PlacarCriterio {
  criterio: string;
  principio: string;
  contagem: { info: number; alerta: number; erro: number };
  densidadePor100Palavras: number;
}

/**
 * Deliberadamente sem "nota geral" nem "aprovado". O placar mede, não aprova.
 */
export interface Placar {
  porCriterio: PlacarCriterio[];
  totalFindings: number;
}

// --- Diagnostic (saída da Camada 1) -------------------------------------------------

export interface DiagnosticMeta {
  lucidVersion: string;
  /** hash estável da Config efetiva, para integridade do snapshot */
  configHash: string;
  normativaVersion: "ABNT NBR ISO 24495-1:2024";
}

export interface Diagnostic {
  /** === Document.source (original normalizado, intacto) */
  texto: string;
  /** ordenados por (start, end, criterio, principio) */
  findings: Finding[];
  placar: Placar;
  metricas: Metricas;
  meta: DiagnosticMeta;
}
