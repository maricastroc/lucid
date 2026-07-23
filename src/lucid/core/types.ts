import type { DataView } from "./data/types";

export type Severity = "info" | "warning" | "error";

export type Category = "lexical" | "syntactic" | "structural" | "metric";

export interface Span {
  start: number;
  end: number;
  text: string;
}

export interface Finding {
  criterion: string;
  category: Category;
  principle: string;
  span: Span;
  severity: Severity;
  suggestion?: string;
  requiresHuman: boolean;
  justification: string;
  meta?: Record<string, string | number | boolean>;
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
  readonly principle: string;
  readonly dataDeps?: readonly string[];
  run(ctx: PassContext): Finding[];
}

export interface Metrics {
  fleschPt: number;
  words: number;
  sentences: number;
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
