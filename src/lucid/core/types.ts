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
  fleschPt: number | null;
  words: number;
  sentences: number;
  syllables: number;
  wordsPerSentence: number;
  syllablesPerWord: number;
  cohesion: CohesionMetrics;
}

export type ReadabilityUnmeasurableCause = "no_words" | "no_sentences";

export type ReadabilityAnomaly =
  | { readonly cause: "small_sample"; readonly words: number; readonly threshold: number }
  | { readonly cause: "sentence_boundary_missing"; readonly wordsPerSentence: number; readonly threshold: number }
  | {
      readonly cause: "syllables_per_word_impossible";
      readonly syllablesPerWord: number;
      readonly threshold: number;
    };

export type ReadabilityScalePosition = "in_range" | "above_range" | "below_range";

export interface ReadabilityBand {
  readonly id: string;
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export type ReadabilityReading =
  | { readonly kind: "unmeasurable"; readonly cause: ReadabilityUnmeasurableCause }
  | {
      readonly kind: "measured";
      readonly value: number;
      readonly position: ReadabilityScalePosition;
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
