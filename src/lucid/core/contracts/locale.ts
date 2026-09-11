import type { Config, ConfigSchema } from "../config";
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
  readonly name: string;
  readonly referenceRange: { readonly min: number; readonly max: number };
  calculate(input: { wordsPerSentence: number; syllablesPerWord: number }): number;
  interpret(metrics: Metrics): ReadabilityReading;
}

export interface MetricServices {
  countSyllables?: (word: string) => number;
  readability?: ReadabilityMetric;
  cohesion?: (doc: Document) => CohesionMetrics;
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
  readonly canonical?: Readonly<Record<string, string>>;
}

export interface LocaleBundle<C extends Config = Config> {
  readonly id: LocaleId;
  readonly standardVersion: string;
  readonly passes: readonly Pass<C>[];
  readonly config: C;
  readonly configSchema: ConfigSchema;
  readonly services: DocumentServices;
  readonly metrics: MetricServices;
  readonly data: LocaleDataRegistry;
  readonly criteria: LocaleCriteria;
  readonly taxonomy: CriterionTaxonomy;
  readonly clauses: ClauseTree;
}
