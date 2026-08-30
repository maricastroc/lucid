import type { Diagnostic } from "@/lucid";
import { copyFor } from "../i18n/copy";
import type { UiLang } from "../i18n/types";
import { readabilityOf } from "./readability";

export const METRIC_ROW_KEYS = [
  "words",
  "sentences",
  "wordsPerSentence",
  "readability",
  "referentialCohesion",
  "adjacentGap",
  "connectives",
] as const;

export type MetricRowKey = (typeof METRIC_ROW_KEYS)[number];

export interface MetricRow {
  readonly key: MetricRowKey;
  readonly label: string;
  readonly value: string;
  readonly qualifier?: string;
  readonly descriptor: boolean;
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function metricRows(diagnostic: Diagnostic, lang: UiLang): readonly MetricRow[] {
  const o = copyFor(lang).overview;
  const m = diagnostic.metrics;
  const co = m.cohesion;
  const readability = readabilityOf(m, lang);

  return [
    { key: "words", label: o.metricWords, value: fmt(m.words), descriptor: false },
    { key: "sentences", label: o.metricSentences, value: fmt(m.sentences), descriptor: false },
    {
      key: "wordsPerSentence",
      label: o.metricWordsPerSentence,
      value: fmt(m.wordsPerSentence),
      descriptor: false,
    },
    {
      key: "readability",
      label: o.metricReadability,
      value: readability.value,
      qualifier: readability.qualifier,
      descriptor: false,
    },
    {
      key: "referentialCohesion",
      label: o.metricReferentialCohesion,
      value: fmt(co.referentialOverlap),
      descriptor: true,
    },
    { key: "adjacentGap", label: o.metricAdjacentGap, value: fmt(co.adjacentGapRatio), descriptor: true },
    { key: "connectives", label: o.metricConnectives, value: fmt(co.connectivesPer100Words), descriptor: true },
  ];
}
