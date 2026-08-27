import type { Config } from "../config";
import type {
  AbbreviationLexicon,
  CohesionMetrics,
  CriterionTaxonomy,
  Document,
  Metrics,
  Pass,
  ReadabilityReading,
  Sentence,
} from "../types";
import type { DataView } from "../data/types";
import type { ClauseTree } from "../coverage/types";

export type LocaleId = string & { readonly __localeBrand: unique symbol };
export function asLocaleId(id: string): LocaleId {
  return id as LocaleId;
}

export interface DocumentServices {
  segmentSentences: (source: string, abbreviations: AbbreviationLexicon) => Sentence[];
}

export interface ReadabilityMetric {
  readonly id: string;
  calculate(input: { wordsPerSentence: number; syllablesPerWord: number }): number;
  interpret(metrics: Metrics): ReadabilityReading;
}

export interface MetricServices {
  countSyllables: (word: string) => number;
  readability: ReadabilityMetric;
  cohesion: (doc: Document) => CohesionMetrics;
  readonly dataDeps?: readonly string[];
}

export interface LocaleDataRegistry {
  createDataView(deps: readonly string[]): DataView;
  readonly documentDatasets: readonly string[];
  dataHashFor(ids: Iterable<string>): string;
  readonly abbreviations: AbbreviationLexicon;
}

export interface LocaleCriteria {
  readonly ids: readonly string[];
}

export interface LocaleBundle {
  readonly id: LocaleId;
  readonly standardVersion: string;
  readonly passes: readonly Pass[];
  readonly config: Config;
  readonly services: DocumentServices;
  readonly metrics: MetricServices;
  readonly data: LocaleDataRegistry;
  readonly criteria: LocaleCriteria;
  readonly taxonomy: CriterionTaxonomy;
  readonly clauses: ClauseTree;
}
