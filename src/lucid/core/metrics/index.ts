import type { Config } from "../config";
import type { ReadabilityMetric } from "../contracts/locale";
import type { CohesionMetrics, Document, Metrics, ReadabilityReading, TableBlock, TableMetrics } from "../types";

export interface MetricServices {
  countSyllables?: (word: string) => number;
  readability?: (input: { wordsPerSentence: number; syllablesPerWord: number }) => number;
  cohesion?: (doc: Document) => CohesionMetrics;
}

export function readabilityReadingOf(metric: ReadabilityMetric | undefined, metrics: Metrics): ReadabilityReading {
  return metric === undefined ? { kind: "unavailable" } : metric.interpret(metrics);
}

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function roundCohesion(c: CohesionMetrics, decimalPlaces: number): CohesionMetrics {
  return {
    referentialOverlap: round(c.referentialOverlap, decimalPlaces),
    adjacentGapRatio: round(c.adjacentGapRatio, decimalPlaces),
    connectivesPer100Words: round(c.connectivesPer100Words, decimalPlaces),
    connectivesByClass: c.connectivesByClass,
  };
}

function zeroMetrics(
  sentenceCount: number,
  wordCount: number,
  syllableCount: number | null,
  cohesion: CohesionMetrics | null,
): Metrics {
  return {
    readability: null,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: 0,
    syllablesPerWord: syllableCount === null ? null : 0,
    cohesion,
  };
}

function tableSummary(tables: readonly TableBlock[]): TableMetrics {
  let cells = 0;
  let words = 0;
  let sentences = 0;
  for (const table of tables) {
    for (const row of table.rows) {
      for (const cell of row.cells) {
        cells += 1;
        words += cell.wordCount;
        for (const paragraph of cell.blocks) sentences += paragraph.sentences.length;
      }
    }
  }
  return { tables: tables.length, cells, words, sentences };
}

function proseView(doc: Document): { doc: Document; tables: readonly TableBlock[] } {
  const tables = doc.blocks.filter((block): block is TableBlock => block.kind === "table");
  if (tables.length === 0) return { doc, tables };

  const inTable = (offset: number): boolean => tables.some((table) => offset >= table.start && offset < table.end);

  return {
    doc: {
      source: doc.source,
      sentences: doc.sentences.filter((sentence) => !inTable(sentence.start)),
      tokens: doc.tokens.filter((token) => !inTable(token.start)),
      blocks: doc.blocks.filter((block) => block.kind !== "table"),
    },
    tables,
  };
}

export function runMetrics(doc: Document, config: Config, services: MetricServices): Metrics {
  const prose = proseView(doc);
  const tables = prose.tables.length === 0 ? undefined : tableSummary(prose.tables);

  const sentenceCount = prose.doc.sentences.length;
  const wordTokens = prose.doc.tokens.filter((t) => t.isWord);
  const wordCount = wordTokens.length;
  const countSyllables = services.countSyllables;
  const syllableCount =
    countSyllables === undefined ? null : wordTokens.reduce((sum, t) => sum + countSyllables(t.text), 0);
  const decimalPlaces = config.metrics.decimalPlaces;
  const cohesion = services.cohesion === undefined ? null : roundCohesion(services.cohesion(prose.doc), decimalPlaces);

  if (sentenceCount === 0 || wordCount === 0) {
    const empty = zeroMetrics(sentenceCount, wordCount, syllableCount, cohesion);
    return tables === undefined ? empty : { ...empty, tables };
  }

  const rawWordsPerSentence = wordCount / sentenceCount;
  const rawSyllablesPerWord = syllableCount === null ? null : syllableCount / wordCount;
  const rawReadability =
    services.readability === undefined || rawSyllablesPerWord === null
      ? null
      : services.readability({
          wordsPerSentence: rawWordsPerSentence,
          syllablesPerWord: rawSyllablesPerWord,
        });

  const measured: Metrics = {
    readability: rawReadability === null ? null : round(rawReadability, decimalPlaces),
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: round(rawWordsPerSentence, decimalPlaces),
    syllablesPerWord: rawSyllablesPerWord === null ? null : round(rawSyllablesPerWord, decimalPlaces),
    cohesion,
  };
  return tables === undefined ? measured : { ...measured, tables };
}
