import type { Config } from "../config";
import type { CohesionMetrics, CriterionTaxonomy, Document, Pass, Sentence } from "../types";
import type { DataView } from "../data/types";

export type LocaleId = string & { readonly __localeBrand: unique symbol };
export function asLocaleId(id: string): LocaleId {
  return id as LocaleId;
}

export interface DocumentServices {
  segmentSentences: (source: string, abbreviations: ReadonlySet<string>) => Sentence[];
}

export interface ReadabilityMetric {
  readonly id: string;
  calculate(input: { wordsPerSentence: number; syllablesPerWord: number }): number;
}

export interface MetricServices {
  countSyllables: (word: string) => number;
  readability: ReadabilityMetric;
  /** Calcula as métricas de coesão de superfície do documento (ADR-061). */
  cohesion: (doc: Document) => CohesionMetrics;
  /** Datasets consumidos pelas métricas (p/ compor o dataHash de forma honesta). */
  readonly dataDeps?: readonly string[];
}

export interface LocaleDataRegistry {
  createDataView(deps: readonly string[]): DataView;
  readonly documentDatasets: readonly string[];
  dataHashFor(ids: Iterable<string>): string;
  readonly abbreviations: ReadonlySet<string>;
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
  /** Classificação de cada critério na taxonomia (ADR-056), keyed por criterion id. */
  readonly taxonomy: CriterionTaxonomy;
}
