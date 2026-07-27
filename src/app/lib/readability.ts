import type { Metrics, ReadabilityAnomaly, ReadabilityReading, ReadabilityUnmeasurableCause } from "@/lucid";
import { localePtBR, READABILITY_REFERENCE_RANGE } from "@/lucid";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export interface ReadabilityDisplay {
  measured: boolean;
  value: string;
  qualifier: string;
  notes: readonly string[];
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const RANGE = `${READABILITY_REFERENCE_RANGE.min}–${READABILITY_REFERENCE_RANGE.max}`;

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

export function describeReadability(reading: ReadabilityReading, lang: UiLang = DEFAULT_UI_LANG): ReadabilityDisplay {
  const r = copyFor(lang).readability;

  if (reading.kind === "unmeasurable") {
    return { measured: false, value: "—", qualifier: r.noMeasure, notes: [unmeasurableNote(reading.cause, lang)] };
  }

  const notes = reading.anomalies.map((a) => anomalyNote(a, lang));
  const value = fmt(reading.value);

  switch (reading.position) {
    case "in_range":
      return {
        measured: true,
        value,
        qualifier: reading.band
          ? r.band(r.bandLabel[reading.band.id] ?? reading.band.label, reading.band.min, reading.band.max)
          : r.inRange(RANGE),
        notes,
      };
    case "above_range":
      return { measured: true, value, qualifier: r.aboveRange(RANGE), notes };
    case "below_range":
      return { measured: true, value, qualifier: r.belowRange(RANGE), notes };
  }
}

export function readabilityOf(metrics: Metrics, lang: UiLang = DEFAULT_UI_LANG): ReadabilityDisplay {
  return describeReadability(localePtBR.metrics.readability.interpret(metrics), lang);
}
