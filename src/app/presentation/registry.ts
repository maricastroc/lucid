import type { CriterionCoverage } from "@/report/eval/contract";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";
import type { AnalysisLocaleId } from "../locale/active";
import type { UiCriterionId } from "../locale/criteria";
import type { CriterionNarrative } from "../lib/narrative-types";
import { EN_PRESENTATION } from "./en-US";
import { CRITERION_ORDER } from "./order";
import { PT_PRESENTATION } from "./pt-BR";
import type { CriterionMeta, LocalePresentation, SwapCopy } from "./types";

const REGISTRY: Readonly<Record<AnalysisLocaleId, LocalePresentation>> = {
  "pt-BR": PT_PRESENTATION,
  "en-US": EN_PRESENTATION,
};

export function presentationOf(localeId: string): LocalePresentation | null {
  return Object.hasOwn(REGISTRY, localeId) ? REGISTRY[localeId as AnalysisLocaleId] : null;
}

export function hasPresentation(localeId: AnalysisLocaleId, criterion: string): boolean {
  return presentationOf(localeId)?.ids.includes(criterion) ?? false;
}

function unknownCriterionMeta(criterion: string): CriterionMeta {
  return {
    label: criterion,
    ruleId: criterion as UiCriterionId,
    kind: "",
    principleName: "",
    channel: "passage",
    markStyleClass: "",
    signal: "",
    why: "",
  };
}

export function metaFor(localeId: AnalysisLocaleId, criterion: string, lang: UiLang = DEFAULT_UI_LANG): CriterionMeta {
  const presentation = presentationOf(localeId);
  if (presentation === null || !presentation.ids.includes(criterion)) return unknownCriterionMeta(criterion);
  return presentation.meta[lang][criterion];
}

export function narrativeFor(localeId: AnalysisLocaleId, criterion: string, lang: UiLang): CriterionNarrative | null {
  const presentation = presentationOf(localeId);
  if (presentation === null || !presentation.ids.includes(criterion)) return null;
  return presentation.narrative[lang][criterion];
}

export function humanLeadFor(localeId: AnalysisLocaleId, criterion: string, lang: UiLang): string | undefined {
  const presentation = presentationOf(localeId);
  if (presentation === null || !presentation.ids.includes(criterion)) return undefined;
  return presentation.humanLead[lang][criterion];
}

export function coverageOf(localeId: AnalysisLocaleId, criterion: string): CriterionCoverage {
  return presentationOf(localeId)?.curated.has(criterion) === true ? "curated" : "productive";
}

export function criterionOrder(localeId: AnalysisLocaleId): readonly string[] {
  const presentation = presentationOf(localeId);
  if (presentation === null) return [];
  return CRITERION_ORDER.filter((criterion) => presentation.ids.includes(criterion));
}

export function thresholdNoteFor(
  localeId: AnalysisLocaleId,
  section: string,
  field: string,
  lang: UiLang,
): string | null {
  return presentationOf(localeId)?.thresholdNotes[lang][`${section}.${field}`] ?? null;
}

export function swapCopyFor(localeId: AnalysisLocaleId, criterion: string, lang: UiLang): SwapCopy | null {
  const presentation = presentationOf(localeId);
  if (presentation === null || !presentation.ids.includes(criterion)) return null;
  return presentation.swap?.[lang][criterion] ?? null;
}
