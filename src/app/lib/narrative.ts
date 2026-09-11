import { type Finding } from "@/lucid";
import type { SplitPoint } from "@/locales/pt-BR";
import type { AnalysisLocale, AnalysisLocaleId } from "../locale/active";
import { metaFor, narrativeFor } from "../presentation/registry";
import { assistida, metaNum, type Confidence } from "./narrative-types";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export type { Confidence, ConfidenceLevel } from "./narrative-types";

export function detectionHeadline(f: Finding, localeId: AnalysisLocaleId, lang: UiLang = DEFAULT_UI_LANG): string {
  const narrative = narrativeFor(localeId, f.criterion, lang);
  if (narrative === null) return f.criterion;
  return narrative.headline?.(f) ?? metaFor(localeId, f.criterion, lang).label;
}

export function detectedProse(f: Finding, localeId: AnalysisLocaleId, lang: UiLang = DEFAULT_UI_LANG): string {
  return narrativeFor(localeId, f.criterion, lang)?.prose?.(f) ?? f.justification;
}

export function buildConfidence(f: Finding, localeId: AnalysisLocaleId, lang: UiLang = DEFAULT_UI_LANG): Confidence {
  return narrativeFor(localeId, f.criterion, lang)?.confidence(f) ?? assistida(f.justification);
}

export interface LongSentenceGuidance {
  words: number | null;
  threshold: number | null;
  subordination: number;
  candidates: SplitPoint[];
}

export function longSentenceGuidance(f: Finding, source: string, locale: AnalysisLocale): LongSentenceGuidance {
  const span = f.span.text;
  const words = metaNum(f, "words");
  const threshold = metaNum(f, "threshold");

  const commas = (span.match(/,/g) ?? []).length;
  const guidance = locale.clauseGuidance;
  const subs = guidance === null ? 0 : (span.match(guidance.subordinators) ?? []).length;
  const subordination = commas + subs;

  const candidates = guidance === null ? [] : guidance.splitPoints(source, f.span);
  return { words, threshold, subordination, candidates };
}
