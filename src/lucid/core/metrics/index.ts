import type { Config } from "../config";
import type { CohesionMetrics, Document, Metrics } from "../types";

export interface MetricServices {
  countSyllables: (word: string) => number;
  readability: (input: { wordsPerSentence: number; syllablesPerWord: number }) => number;
  cohesion: (doc: Document) => CohesionMetrics;
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
  syllableCount: number,
  cohesion: CohesionMetrics,
): Metrics {
  return {
    fleschPt: 0,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: 0,
    syllablesPerWord: 0,
    cohesion,
  };
}

export function runMetrics(doc: Document, config: Config, services: MetricServices): Metrics {
  const sentenceCount = doc.sentences.length;
  const wordTokens = doc.tokens.filter((t) => t.isWord);
  const wordCount = wordTokens.length;
  const syllableCount = wordTokens.reduce((sum, t) => sum + services.countSyllables(t.text), 0);
  const decimalPlaces = config.metrics.decimalPlaces;
  const cohesion = roundCohesion(services.cohesion(doc), decimalPlaces);

  if (sentenceCount === 0 || wordCount === 0) {
    return zeroMetrics(sentenceCount, wordCount, syllableCount, cohesion);
  }

  const rawWordsPerSentence = wordCount / sentenceCount;
  const rawSyllablesPerWord = syllableCount / wordCount;
  const rawFleschPt = services.readability({
    wordsPerSentence: rawWordsPerSentence,
    syllablesPerWord: rawSyllablesPerWord,
  });

  return {
    fleschPt: round(rawFleschPt, decimalPlaces),
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: round(rawWordsPerSentence, decimalPlaces),
    syllablesPerWord: round(rawSyllablesPerWord, decimalPlaces),
    cohesion,
  };
}
