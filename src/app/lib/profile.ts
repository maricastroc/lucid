import { configDeviations, configSections, type Config, type ConfigDeviation, type ThresholdBasis } from "@/lucid";
import type { AnalysisLocale } from "../locale/active";
import { metaFor } from "./criteria";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

type KnobLabelKey =
  | "knobSentenceWarn"
  | "knobParagraph"
  | "knobHeading"
  | "knobSubordination"
  | "knobChainedNominalization"
  | "knobProseEnumeration";

interface KnobSpec {
  readonly labelKey: KnobLabelKey;
  readonly min: number;
  readonly max: number;
}

const KNOB_SPECS: ReadonlyArray<readonly [criterion: string, field: string, spec: KnobSpec]> = [
  ["long_sentence", "warnAbove", { labelKey: "knobSentenceWarn", min: 5, max: 120 }],
  ["paragraph_length", "maxSentences", { labelKey: "knobParagraph", min: 1, max: 30 }],
  ["long_heading", "maxWords", { labelKey: "knobHeading", min: 2, max: 40 }],
  ["subordinacao_densa", "minPorFrase", { labelKey: "knobSubordination", min: 2, max: 12 }],
  ["nominalizacao_encadeada", "minPorFrase", { labelKey: "knobChainedNominalization", min: 2, max: 12 }],
  ["prose_enumeration", "minMarkers", { labelKey: "knobProseEnumeration", min: 2, max: 12 }],
  ["prose_enumeration", "minItems", { labelKey: "knobProseEnumeration", min: 2, max: 12 }],
];

export interface Knob extends KnobSpec {
  readonly section: string;
  readonly field: string;
  readonly criterion: string;
  readonly basis: ThresholdBasis | null;
}

export type LocaleConfigView = Pick<AnalysisLocale, "configSchema" | "defaultConfig">;

export function knobLabel(knob: Knob, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).profile[knob.labelKey];
}

export function sectionCriterion(locale: LocaleConfigView, section: string): string | null {
  return locale.configSchema[section]?.criterion ?? null;
}

export function thresholdBasisOf(locale: LocaleConfigView, section: string, field: string): ThresholdBasis | null {
  return locale.configSchema[section]?.thresholds?.[field] ?? null;
}

export function knobsFor(locale: LocaleConfigView): readonly Knob[] {
  const defaults = configSections(locale.defaultConfig);
  const knobs: Knob[] = [];
  for (const [criterion, field, spec] of KNOB_SPECS) {
    const section = Object.keys(locale.configSchema).find(
      (name) => locale.configSchema[name].criterion === criterion && typeof defaults[name]?.[field] === "number",
    );
    if (section === undefined) continue;
    knobs.push({ ...spec, section, field, criterion, basis: thresholdBasisOf(locale, section, field) });
  }
  return knobs;
}

export function toggleableSectionsFor(locale: LocaleConfigView): readonly string[] {
  const defaults = configSections(locale.defaultConfig);
  return Object.keys(locale.configSchema).filter((section) => {
    const spec = locale.configSchema[section];
    return spec.criterion !== null && spec.role === undefined && typeof defaults[section]?.enabled === "boolean";
  });
}

export function hasProvisionalThresholds(locale: LocaleConfigView): boolean {
  return knobsFor(locale).some((knob) => knob.basis?.status === "provisional");
}

export function criterionLabelFor(section: string, lang: UiLang, locale: AnalysisLocale): string {
  const criterion = sectionCriterion(locale, section);
  return criterion === null ? section : metaFor(locale.id, criterion, lang).label;
}

export function describeDeviation(deviation: ConfigDeviation, lang: UiLang, locale: AnalysisLocale): string {
  const p = copyFor(lang).profile;
  const label = criterionLabelFor(deviation.section, lang, locale);
  if (deviation.field === "enabled") {
    return deviation.value === false ? p.deviationOff(label) : p.deviationOn(label);
  }
  const knob = knobsFor(locale).find((k) => k.section === deviation.section && k.field === deviation.field);
  const what = knob === undefined ? `${label} · ${deviation.field}` : knobLabel(knob, lang);
  return p.deviationValue(what, String(deviation.value), String(deviation.fallback));
}

export function disabledCriteria(config: Config, lang: UiLang, locale: AnalysisLocale): string[] {
  return configDeviations(config, locale.defaultConfig)
    .filter((d) => d.field === "enabled" && d.value === false)
    .map((d) => criterionLabelFor(d.section, lang, locale));
}

export function readNumber(config: Config, section: string, field: string): number {
  return (config as unknown as Record<string, Record<string, number>>)[section][field];
}

export function readEnabled(config: Config, section: string): boolean {
  const values = (config as unknown as Record<string, Record<string, unknown>>)[section];
  return values.enabled === true;
}

export function withNumber(config: Config, section: string, field: string, value: number): Config {
  const current = (config as unknown as Record<string, Record<string, unknown>>)[section];
  return { ...config, [section]: { ...current, [field]: value } };
}

export function withEnabled(config: Config, section: string, enabled: boolean): Config {
  const current = (config as unknown as Record<string, Record<string, unknown>>)[section];
  return { ...config, [section]: { ...current, enabled } };
}
