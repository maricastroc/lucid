import type { Config } from "../config";
import { DEFAULT_CONFIG } from "../config";
import type { Document, Metrics } from "../types";
import { countSyllables } from "../document/syllables";
import { calculateFleschPt } from "./flesch-pt";

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function zeroMetrics(sentenceCount: number, wordCount: number, syllableCount: number): Metrics {
  return {
    fleschPt: 0,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: 0,
    syllablesPerWord: 0,
  };
}

export function runMetrics(doc: Document, config: Config = DEFAULT_CONFIG): Metrics {
  const sentenceCount = doc.sentences.length;
  const wordTokens = doc.tokens.filter((t) => t.isWord);
  const wordCount = wordTokens.length;
  const syllableCount = wordTokens.reduce((sum, t) => sum + countSyllables(t.text), 0);

  if (sentenceCount === 0 || wordCount === 0) {
    return zeroMetrics(sentenceCount, wordCount, syllableCount);
  }

  const rawWordsPerSentence = wordCount / sentenceCount;
  const rawSyllablesPerWord = syllableCount / wordCount;
  const rawFleschPt = calculateFleschPt(rawWordsPerSentence, rawSyllablesPerWord);

  const decimalPlaces = config.metrics.decimalPlaces;

  return {
    fleschPt: round(rawFleschPt, decimalPlaces),
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: round(rawWordsPerSentence, decimalPlaces),
    syllablesPerWord: round(rawSyllablesPerWord, decimalPlaces),
  };
}
