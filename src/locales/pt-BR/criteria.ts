/**
 * Conjunto CANÔNICO de critérios do locale pt-BR (ADR-029, relocado por ADR-031). Antes vivia em
 * `core/criteria.ts`; como o conjunto de critérios é ESPECÍFICO do idioma, passou a ser do locale.
 * O core não enumera critérios — `Pass.criterion` é `string` (o contrato neutro).
 *
 * A trava anti-drift do ADR-029 é preservada: `test/criteria-registry.test.ts` afirma que `PASSES`,
 * `CRITERION_IDS` e a apresentação (`CRITERION_META`/`CRITERION_ORDER`) descrevem EXATAMENTE o mesmo
 * conjunto; e a UI mantém `Record<CriterionId, …>` (completude em compile-time).
 *
 * A ordem aqui é só de leitura; o conjunto é o que importa (o teste compara SETS).
 */
export const CRITERION_IDS = [
  "long_sentence",
  "passive_voice",
  "nominalization",
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
] as const;

/** Id estável de um critério do pt-BR — a união derivada de `CRITERION_IDS`. */
export type CriterionId = (typeof CRITERION_IDS)[number];

/** Narrowing de `string` para `CriterionId`. */
export function isCriterionId(value: string): value is CriterionId {
  return (CRITERION_IDS as readonly string[]).includes(value);
}
