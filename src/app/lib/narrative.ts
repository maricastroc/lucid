import { clauseSplitPoints, isCriterionId, type Finding, type SplitPoint } from "@/lucid";
import { metaFor } from "./criteria";
import { assistida, metaNum, type Confidence, type NarrativeSet } from "./narrative-types";
import { NARRATIVE_PT } from "./narrative.pt";
import { NARRATIVE_EN } from "./narrative.en";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export type { Confidence, ConfidenceLevel } from "./narrative-types";

const NARRATIVE: Record<UiLang, NarrativeSet> = { "pt-BR": NARRATIVE_PT, en: NARRATIVE_EN };

export function detectionHeadline(f: Finding, lang: UiLang = DEFAULT_UI_LANG): string {
  const c = f.criterion;
  if (!isCriterionId(c)) return c;
  return NARRATIVE[lang][c].headline?.(f) ?? metaFor(c, lang).label;
}

export function detectedProse(f: Finding, lang: UiLang = DEFAULT_UI_LANG): string {
  const c = f.criterion;
  if (!isCriterionId(c)) return f.justification;
  return NARRATIVE[lang][c].prose?.(f) ?? f.justification;
}

export function buildConfidence(f: Finding, lang: UiLang = DEFAULT_UI_LANG): Confidence {
  const c = f.criterion;
  if (!isCriterionId(c)) return assistida(f.justification);
  return NARRATIVE[lang][c].confidence(f);
}

export interface LongSentenceGuidance {
  words: number | null;
  threshold: number | null;
  over: number | null;
  subordination: number;
  targetSentences: number | null;
  candidates: SplitPoint[];
}

const SUBORD_RE = /\b(que|quando|porque|embora|cuj[ao]s?|onde|caso|conforme|porquanto|ainda que|de modo que)\b/gi;

export function longSentenceGuidance(f: Finding, source: string): LongSentenceGuidance {
  const span = f.span.text;
  const words = metaNum(f, "words");
  const threshold = metaNum(f, "threshold");
  const over = words != null && threshold != null ? words - threshold : null;
  const targetSentences = words != null && threshold != null ? Math.ceil(words / threshold) : null;

  const commas = (span.match(/,/g) ?? []).length;
  const subs = (span.match(SUBORD_RE) ?? []).length;
  const subordination = commas + subs;

  const candidates = clauseSplitPoints(source, f.span);
  return { words, threshold, over, subordination, targetSentences, candidates };
}
