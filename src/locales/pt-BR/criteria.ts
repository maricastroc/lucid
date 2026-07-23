export const CRITERION_IDS = [
  "long_sentence",
  "passive_voice",
  "nominalization",
  "nominalizacao_encadeada",
  "jargon",
  "mais_que_perfeito_sintetico",
  "gerundismo",
  "adverbio_mente_denso",
  "redundancia",
  "perifrase_inflada",
  "paragraph_length",
  "prose_enumeration",
  "mesoclise",
  "dupla_negacao",
  "subordinacao_densa",
  "leitor_terceira_pessoa",
  "salto_de_nivel_titulo",
  "long_heading",
  "single_item_list",
  "heading_body_mismatch",
] as const;

export type CriterionId = (typeof CRITERION_IDS)[number];

export function isCriterionId(value: string): value is CriterionId {
  return (CRITERION_IDS as readonly string[]).includes(value);
}
