import { configDeviations, type Config, type ConfigDeviation } from "@/lucid";
import { metaFor } from "./criteria";

export interface Knob {
  readonly section: keyof Config;
  readonly field: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
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
  { section: "sentenceLength", field: "warnAbove", label: "Frase longa — alerta acima de", min: 5, max: 120 },
  { section: "sentenceLength", field: "errorAbove", label: "Frase longa — prioritário acima de", min: 5, max: 200 },
  { section: "paragraphLength", field: "maxSentences", label: "Parágrafo longo — acima de (frases)", min: 1, max: 30 },
  { section: "longHeading", field: "maxWords", label: "Título longo — acima de (palavras)", min: 2, max: 40 },
  { section: "subordinacao", field: "minPorFrase", label: "Subordinação densa — a partir de (orações)", min: 2, max: 12 },
  { section: "nominalizacaoEncadeada", field: "minPorFrase", label: "Nominalização encadeada — a partir de", min: 2, max: 12 },
  { section: "proseEnumeration", field: "minMarkers", label: "Enumeração em prosa — a partir de (itens)", min: 2, max: 12 },
];

export const TOGGLEABLE_SECTIONS: readonly string[] = Object.keys(SECTION_CRITERION).filter(
  (section) => section !== "sentenceLength",
);

export function criterionLabelFor(section: string): string {
  const criterion = SECTION_CRITERION[section];
  return criterion === undefined ? section : metaFor(criterion).label;
}

export function describeDeviation(deviation: ConfigDeviation): string {
  const label = criterionLabelFor(deviation.section);
  if (deviation.field === "enabled") {
    return deviation.value === false
      ? `${label}: desligado (padrão: ligado)`
      : `${label}: ligado (padrão: desligado)`;
  }
  const knob = KNOBS.find((k) => k.section === deviation.section && k.field === deviation.field);
  const what = knob === undefined ? `${label} · ${deviation.field}` : knob.label;
  return `${what} ${deviation.value} (padrão: ${deviation.fallback})`;
}

export function disabledCriteria(config: Config): string[] {
  return configDeviations(config)
    .filter((d) => d.field === "enabled" && d.value === false)
    .map((d) => criterionLabelFor(d.section));
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
