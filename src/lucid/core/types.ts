import type { DataView } from "./data/types";

export type Severity = "info" | "warning" | "error";

export type Category = "lexical" | "syntactic" | "structural" | "metric";

export type CriterionSource = "iso-24495-1" | "editorial-pt-br" | "structural-heuristic";

export type PrincipleGroup = "relevant" | "findable" | "understandable" | "usable";

export interface NormativeReference {
  standard: "ABNT NBR ISO 24495-1";
  section: string;
}

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
  source: CriterionSource;
  principleGroup: PrincipleGroup;
  normativeReference?: NormativeReference;
  span: Span;
  severity: Severity;
  suggestion?: string;
  requiresHuman: boolean;
  justification: string;
  meta?: Record<string, string | number | boolean>;
}

export type PassFinding = Omit<Finding, "source" | "principleGroup" | "normativeReference">;

/**
 * Léxico de abreviações da locale, em DUAS CLASSES (A-2). "Ser abreviação" e
 * "nunca encerrar frase" são fatos distintos, e confundi-los corrompia a
 * segmentação:
 *
 * - `blocking` — abreviações PROCLÍTICAS: introduzem o que vem depois e por isso
 *   nunca encerram a frase ("Sr. Silva", "art. 5", "Fig. 3", "12 jan. 2024").
 *   O ponto delas é sempre interno à frase.
 * - `units` — unidades de medida ENCLÍTICAS: fecham uma medição e PODEM encerrar
 *   a frase ("A sessão abre às 9h. Todos devem chegar"). Elas só deixam de
 *   bloquear a fronteira EM CONTEXTO DE MEDIÇÃO — isto é, precedidas de número.
 *   Fora dele continuam bloqueando, preservando usos não-métricos da mesma
 *   grafia ("Valor min. 5 reais", "seg. 12 de maio").
 *
 * Em nenhum caso o léxico FORÇA uma fronteira: ele apenas deixa de suprimi-la, e
 * a confirmação de início de frase (maiúscula/dígito/aspa) continua decidindo.
 */
export interface AbbreviationLexicon {
  readonly blocking: ReadonlySet<string>;
  readonly units: ReadonlySet<string>;
}

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

export interface CohesionMetrics {
  referentialOverlap: number;
  adjacentGapRatio: number;
  connectivesPer100Words: number;
  connectivesByClass: Record<ConnectiveClass, number>;
}

export interface Metrics {
  /**
   * `null` quando NÃO HÁ medida (texto sem palavra ou sem frase) — nunca um número
   * fabricado. O `0` que ficava aqui é um ponto real da escala Flesch-PT ("muito
   * difícil"), então um texto vazio se reportava como o pior texto possível.
   *
   * O valor NUNCA é limitado a 0–100: a engine não altera o que mediu. Interpretação
   * (faixa, posição na escala, anomalia) é camada derivada — ver `ReadabilityReading`.
   */
  fleschPt: number | null;
  words: number;
  sentences: number;
  syllables: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  cohesion: CohesionMetrics;
}

/** Por que não há medida. Cada causa é explícita — nunca um "indisponível" genérico. */
export type ReadabilityUnmeasurableCause = "no_words" | "no_sentences";

/**
 * Anomalia da MEDIÇÃO, não do texto: o valor foi calculado e continua exibido, mas
 * as entradas da fórmula caíram fora do que ela descreve. Cada anomalia carrega a
 * grandeza observada e o limiar que ela cruzou, para a UI poder dizer *por que* — não
 * existe um estado `out_of_domain` genérico, de propósito.
 */
export type ReadabilityAnomaly =
  | { readonly cause: "small_sample"; readonly words: number; readonly threshold: number }
  | { readonly cause: "sentence_boundary_missing"; readonly wordsPerSentence: number; readonly threshold: number }
  | {
      readonly cause: "syllables_per_word_impossible";
      readonly syllablesPerWord: number;
      readonly threshold: number;
    };

/** Posição do valor em relação ao intervalo de referência — coordenada, não nota. */
export type ReadabilityScalePosition = "in_range" | "above_range" | "below_range";

export interface ReadabilityBand {
  readonly id: string;
  readonly min: number;
  readonly max: number;
  /** Rótulo do locale (o core tipa; quem escreve é o locale, como em `Finding.justification`). */
  readonly label: string;
}

/**
 * Leitura interpretada da leiturabilidade, SEMPRE ao lado do valor bruto — nunca em
 * lugar dele. Não há variante de aprovação: leiturabilidade é descritor de apoio
 * (Princípio 4), nunca selo.
 */
export type ReadabilityReading =
  | { readonly kind: "unmeasurable"; readonly cause: ReadabilityUnmeasurableCause }
  | {
      readonly kind: "measured";
      readonly value: number;
      readonly position: ReadabilityScalePosition;
      /** `null` fora do intervalo de referência: ali não existe faixa, só posição. */
      readonly band: ReadabilityBand | null;
      readonly anomalies: readonly ReadabilityAnomaly[];
    };

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
