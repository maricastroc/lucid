import type {
  Metrics,
  ReadabilityAnomaly,
  ReadabilityMetric,
  ReadabilityReading,
  ReadabilityUnmeasurableCause,
} from "@/lucid";
import { readabilityReadingOf } from "@/lucid";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export interface ReadabilityDisplay {
  measured: boolean;
  value: string;
  qualifier: string;
  notes: readonly string[];
}

export interface ReadabilityRange {
  readonly min: number;
  readonly max: number;
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const rangeLabel = (range: ReadabilityRange | null): string => (range === null ? "—" : `${range.min}–${range.max}`);

function unmeasurableNote(cause: ReadabilityUnmeasurableCause, lang: UiLang): string {
  const r = copyFor(lang).readability;
  return cause === "no_words" ? r.noWords : r.noSentences;
}

function anomalyNote(a: ReadabilityAnomaly, lang: UiLang): string {
  const r = copyFor(lang).readability;
  switch (a.cause) {
    case "small_sample":
      return r.smallSample(a.words, a.threshold);
    case "sentence_boundary_missing":
      return r.sentenceBoundaryMissing(fmt(a.wordsPerSentence), a.threshold);
    case "syllables_per_word_impossible":
      return r.syllablesImpossible(fmt(a.syllablesPerWord), a.threshold);
  }
}

export function describeReadability(
  reading: ReadabilityReading,
  lang: UiLang = DEFAULT_UI_LANG,
  range: ReadabilityRange | null = null,
): ReadabilityDisplay {
  const r = copyFor(lang).readability;

  if (reading.kind === "unavailable") {
    return { measured: false, value: "—", qualifier: r.unavailable, notes: [r.unavailableWhy] };
  }

  if (reading.kind === "unmeasurable") {
    return { measured: false, value: "—", qualifier: r.noMeasure, notes: [unmeasurableNote(reading.cause, lang)] };
  }

  const notes = reading.anomalies.map((a) => anomalyNote(a, lang));
  const value = fmt(reading.value);
  const bounds = rangeLabel(range);

  switch (reading.position) {
    case "in_range":
      return {
        measured: true,
        value,
        qualifier: reading.band
          ? r.band(r.bandLabel[reading.band.id] ?? reading.band.label, reading.band.min, reading.band.max)
          : r.inRange(bounds),
        notes,
      };
    case "above_range":
      return { measured: true, value, qualifier: r.aboveRange(bounds), notes };
    case "below_range":
      return { measured: true, value, qualifier: r.belowRange(bounds), notes };
  }
}

export function readabilityOf(
  metrics: Metrics,
  lang: UiLang,
  metric: ReadabilityMetric | undefined,
): ReadabilityDisplay {
  return describeReadability(readabilityReadingOf(metric, metrics), lang, metric?.referenceRange ?? null);
}
