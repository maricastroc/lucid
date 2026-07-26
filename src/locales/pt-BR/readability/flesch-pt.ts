import type {
  Metrics,
  ReadabilityAnomaly,
  ReadabilityBand,
  ReadabilityReading,
  ReadabilityScalePosition,
} from "@/lucid/core/types";

export function calculateFleschPt(wordsPerSentence: number, syllablesPerWord: number): number {
  return 248.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}

const REFERENCE_RANGE = { min: 0, max: 100 } as const;

const BANDS: readonly ReadabilityBand[] = [
  { id: "very_easy", min: 75, max: 100, label: "muito fácil" },
  { id: "easy", min: 50, max: 75, label: "fácil" },
  { id: "hard", min: 25, max: 50, label: "difícil" },
  { id: "very_hard", min: 0, max: 25, label: "muito difícil" },
];

const MAX_PLAUSIBLE_SYLLABLES_PER_WORD = 20;

const MAX_PLAUSIBLE_WORDS_PER_SENTENCE = 100;

const MIN_INTERPRETABLE_WORDS = 20;

function bandFor(value: number): ReadabilityBand | null {
  return BANDS.find((b) => value >= b.min) ?? null;
}

function positionOf(value: number): ReadabilityScalePosition {
  if (value > REFERENCE_RANGE.max) return "above_range";
  if (value < REFERENCE_RANGE.min) return "below_range";
  return "in_range";
}

export function interpretFleschPt(metrics: Metrics): ReadabilityReading {
  if (metrics.fleschPt === null) {
    return { kind: "unmeasurable", cause: metrics.words === 0 ? "no_words" : "no_sentences" };
  }

  const anomalies: ReadabilityAnomaly[] = [];
  if (metrics.syllablesPerWord > MAX_PLAUSIBLE_SYLLABLES_PER_WORD) {
    anomalies.push({
      cause: "syllables_per_word_impossible",
      syllablesPerWord: metrics.syllablesPerWord,
      threshold: MAX_PLAUSIBLE_SYLLABLES_PER_WORD,
    });
  }
  if (metrics.wordsPerSentence > MAX_PLAUSIBLE_WORDS_PER_SENTENCE) {
    anomalies.push({
      cause: "sentence_boundary_missing",
      wordsPerSentence: metrics.wordsPerSentence,
      threshold: MAX_PLAUSIBLE_WORDS_PER_SENTENCE,
    });
  }
  if (metrics.words < MIN_INTERPRETABLE_WORDS) {
    anomalies.push({ cause: "small_sample", words: metrics.words, threshold: MIN_INTERPRETABLE_WORDS });
  }

  const position = positionOf(metrics.fleschPt);
  return {
    kind: "measured",
    value: metrics.fleschPt,
    position,
    band: position === "in_range" ? bandFor(metrics.fleschPt) : null,
    anomalies,
  };
}

export const READABILITY_REFERENCE_RANGE = REFERENCE_RANGE;
