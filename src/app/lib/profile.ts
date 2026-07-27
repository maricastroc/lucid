import { configDeviations, type Config, type ConfigDeviation } from "@/lucid";
import { metaFor } from "./criteria";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

export interface Knob {
  readonly section: keyof Config;
  readonly field: string;
  readonly labelKey: KnobLabelKey;
  readonly min: number;
  readonly max: number;
}

type KnobLabelKey =
  | "knobSentenceWarn"
  | "knobSentenceError"
  | "knobParagraph"
  | "knobHeading"
  | "knobSubordination"
  | "knobChainedNominalization"
  | "knobProseEnumeration";

export function knobLabel(knob: Knob, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).profile[knob.labelKey];
}

export const SECTION_CRITERION: Record<string, string> = {
  sentenceLength: "long_sentence",
  passiveVoice: "passive_voice",
  passivaSintetica: "passiva_sintetica",
  nominalization: "nominalization",
  nominalizacaoEncadeada: "nominalizacao_encadeada",
  jargon: "jargon",
  siglaSemExpansao: "sigla_sem_expansao",
  maisQuePerfeito: "mais_que_perfeito_sintetico",
  gerundismo: "gerundismo",
  adverbioMente: "adverbio_mente_denso",
  adverbiosVagos: "adverbios_vagos",
  redundancia: "redundancia",
  perifraseInflada: "perifrase_inflada",
  paragraphLength: "paragraph_length",
  proseEnumeration: "prose_enumeration",
  mesoclise: "mesoclise",
  duplaNegacao: "dupla_negacao",
  subordinacao: "subordinacao_densa",
  leitorTerceiraPessoa: "leitor_terceira_pessoa",
  hierarquiaTitulos: "salto_de_nivel_titulo",
  longHeading: "long_heading",
  singleItemList: "single_item_list",
  headingBodyMismatch: "heading_body_mismatch",
};

export const KNOBS: readonly Knob[] = [
  { section: "sentenceLength", field: "warnAbove", labelKey: "knobSentenceWarn", min: 5, max: 120 },
  { section: "sentenceLength", field: "errorAbove", labelKey: "knobSentenceError", min: 5, max: 200 },
  { section: "paragraphLength", field: "maxSentences", labelKey: "knobParagraph", min: 1, max: 30 },
  { section: "longHeading", field: "maxWords", labelKey: "knobHeading", min: 2, max: 40 },
  { section: "subordinacao", field: "minPorFrase", labelKey: "knobSubordination", min: 2, max: 12 },
  { section: "nominalizacaoEncadeada", field: "minPorFrase", labelKey: "knobChainedNominalization", min: 2, max: 12 },
  { section: "proseEnumeration", field: "minMarkers", labelKey: "knobProseEnumeration", min: 2, max: 12 },
];

export const TOGGLEABLE_SECTIONS: readonly string[] = Object.keys(SECTION_CRITERION).filter(
  (section) => section !== "sentenceLength",
);

export function criterionLabelFor(section: string, lang: UiLang = DEFAULT_UI_LANG): string {
  const criterion = SECTION_CRITERION[section];
  return criterion === undefined ? section : metaFor(criterion, lang).label;
}

export function describeDeviation(deviation: ConfigDeviation, lang: UiLang = DEFAULT_UI_LANG): string {
  const p = copyFor(lang).profile;
  const label = criterionLabelFor(deviation.section, lang);
  if (deviation.field === "enabled") {
    return deviation.value === false ? p.deviationOff(label) : p.deviationOn(label);
  }
  const knob = KNOBS.find((k) => k.section === deviation.section && k.field === deviation.field);
  const what = knob === undefined ? `${label} · ${deviation.field}` : knobLabel(knob, lang);
  return p.deviationValue(what, String(deviation.value), String(deviation.fallback));
}

export function disabledCriteria(config: Config, lang: UiLang = DEFAULT_UI_LANG): string[] {
  return configDeviations(config)
    .filter((d) => d.field === "enabled" && d.value === false)
    .map((d) => criterionLabelFor(d.section, lang));
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
