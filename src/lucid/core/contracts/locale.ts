import type { Config } from "../config";
import type { Pass, Sentence } from "../types";
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
}
