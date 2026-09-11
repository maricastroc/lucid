import type { Diagnostic } from "@/lucid";
import { copyFor } from "../i18n/copy";
import type { UiLang } from "../i18n/types";
import { requireAnalysisLocale } from "../locale/active";
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
  const unavailable = copyFor(lang).readability.unavailable;
  const m = diagnostic.metrics;
  const co = m.cohesion;
  const locale = requireAnalysisLocale(diagnostic.meta.localeId);
  const readability = readabilityOf(m, lang, locale.readability);
  const cohesionRow = (key: MetricRowKey, label: string, pick: (c: NonNullable<typeof co>) => number): MetricRow =>
    co === null
      ? { key, label, value: "—", qualifier: unavailable, descriptor: true }
      : { key, label, value: fmt(pick(co)), descriptor: true };

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
    cohesionRow("referentialCohesion", o.metricReferentialCohesion, (c) => c.referentialOverlap),
    cohesionRow("adjacentGap", o.metricAdjacentGap, (c) => c.adjacentGapRatio),
    cohesionRow("connectives", o.metricConnectives, (c) => c.connectivesPer100Words),
  ];
}
