import type { DataView } from "./data/types";

export type Severity = "info" | "warning" | "error";

export type Category = "lexical" | "syntactic" | "structural" | "metric";

/**
 * De onde vem a autoridade do critério (ADR-056):
 * - "iso-24495-1": operacionaliza uma diretriz que a ABNT NBR ISO 24495-1 enuncia
 *   (mesmo em nível de princípio). SÓ estes carregam `normativeReference`.
 * - "editorial-pt-br": extensão editorial específica do português; a norma NÃO
 *   trata do fenômeno. Contribui para uma dimensão, mas nunca cita a ISO.
 * - "structural-heuristic": heurística de higiene estrutural, sem diretriz ISO
 *   direta nem fenômeno específico do PT.
 */
export type CriterionSource = "iso-24495-1" | "editorial-pt-br" | "structural-heuristic";

/** Os quatro princípios da ABNT NBR ISO 24495-1 (5.1..5.4). */
export type PrincipleGroup = "relevant" | "findable" | "understandable" | "usable";

/** Referência normativa direta — existe APENAS quando source === "iso-24495-1". */
export interface NormativeReference {
  standard: "ABNT NBR ISO 24495-1";
  section: string;
}

/**
 * Classificação de um critério na taxonomia (ADR-056). É uma união discriminada
 * pela `source` de modo que o compilador GARANTE a invariante de honestidade:
 * `normativeReference` existe se e somente se `source === "iso-24495-1"`.
 */
export type CriterionTaxonomyEntry =
  | { source: "iso-24495-1"; principleGroup: PrincipleGroup; normativeReference: NormativeReference }
  | { source: "editorial-pt-br"; principleGroup: PrincipleGroup }
  | { source: "structural-heuristic"; principleGroup: PrincipleGroup };

export type CriterionTaxonomy = Record<string, CriterionTaxonomyEntry>;

export interface Span {
  start: number;
  end: number;
  text: string;
}

export interface Finding {
  criterion: string;
  category: Category;
  /** Proveniência da autoridade do critério (ADR-056), carimbada pelo analyzer. */
  source: CriterionSource;
  /** Dimensão de Linguagem Simples à qual o critério contribui. */
  principleGroup: PrincipleGroup;
  /** Referência normativa direta — presente só quando `source === "iso-24495-1"`. */
  normativeReference?: NormativeReference;
  span: Span;
  severity: Severity;
  suggestion?: string;
  requiresHuman: boolean;
  justification: string;
  meta?: Record<string, string | number | boolean>;
}

/**
 * O que um pass devolve: um Finding SEM os campos de proveniência. O analyzer
 * carimba `source`/`principleGroup`/`normativeReference` a partir da taxonomia do
 * locale (fonte única), garantindo que nenhum pass invente sua própria autoridade.
 */
export type PassFinding = Omit<Finding, "source" | "principleGroup" | "normativeReference">;

export interface Token {
  text: string;
  lower: string;
  start: number;
  end: number;
  isWord: boolean;
}

export interface Sentence {
  text: string;
  start: number;
  end: number;
  tokens: readonly Token[];
  wordCount: number;
}

interface BlockBase {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface ParagraphBlock extends BlockBase {
  readonly kind: "paragraph";
  readonly sentences: readonly Sentence[];
  readonly wordCount: number;
}

export interface HeadingBlock extends BlockBase {
  readonly kind: "heading";
  readonly level: number;
  readonly sentences: readonly Sentence[];
  readonly wordCount: number;
}

export interface ListItemBlock extends BlockBase {
  readonly kind: "listItem";
  readonly sentences: readonly Sentence[];
  readonly wordCount: number;
}

export interface ListBlock extends BlockBase {
  readonly kind: "list";
  readonly ordered: boolean;
  readonly items: readonly ListItemBlock[];
}

export type Block = ParagraphBlock | HeadingBlock | ListBlock;
export interface Document {
  readonly source: string;
  readonly sentences: readonly Sentence[];
  readonly tokens: readonly Token[];
  readonly blocks: readonly Block[];
}

export interface PassContext {
  readonly doc: Document;
  readonly config: import("./config").Config;
  readonly data: DataView;
}

export interface Pass {
  readonly criterion: string;
  readonly category: Category;
  readonly dataDeps?: readonly string[];
  run(ctx: PassContext): PassFinding[];
}

export type ConnectiveClass = "additive" | "adversative" | "causal" | "temporal" | "conclusive";

/**
 * Métricas de coesão de SUPERFÍCIE (ADR-061) — descritores neutros, nunca
 * findings e nunca no placar. Valor alto ou baixo não é, por si só, aprovação
 * nem reprovação (coesão alta pode ser repetição; baixa pode ser variação).
 */
export interface CohesionMetrics {
  /** Sobreposição lexical média (Jaccard) de palavras de conteúdo entre frases adjacentes (0..1). */
  referentialOverlap: number;
  /** Proporção de pares de frases adjacentes SEM nenhuma palavra de conteúdo em comum (0..1). */
  adjacentGapRatio: number;
  /** Conectivos de discurso por 100 palavras. */
  connectivesPer100Words: number;
  /** Contagem de conectivos por classe. */
  connectivesByClass: Record<ConnectiveClass, number>;
}

export interface Metrics {
  fleschPt: number;
  words: number;
  sentences: number;
  syllables: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  cohesion: CohesionMetrics;
}

export interface CriterionScore {
  criterion: string;
  count: { info: number; warning: number; error: number };
  densityPer100Words: number;
}

export interface Score {
  byCriterion: CriterionScore[];
  totalFindings: number;
}

export interface DiagnosticMeta {
  lucidVersion: string;
  localeId: string;
  configHash: string;
  dataHash: string;
  standardVersion: string;
}

export interface Diagnostic {
  text: string;
  findings: Finding[];
  score: Score;
  metrics: Metrics;
  meta: DiagnosticMeta;
}
