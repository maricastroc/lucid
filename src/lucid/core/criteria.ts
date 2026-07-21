/**
 * Conjunto CANÔNICO de critérios da Camada 1 — a fonte única de verdade sobre QUAIS
 * critérios existem (ADR-029).
 *
 * Antes, a UI (`app/lib/criteria.ts`) mantinha uma união `Criterion` digitada à mão, paralela
 * ao `PASSES` do engine: adicionar um pass não quebrava nada, e a apresentação caía
 * silenciosamente no meta de outro critério. Agora o engine PUBLICA o conjunto e o tipo:
 *
 *   · `CriterionId` tipa `Pass.criterion` → um pass não pode usar um id fora desta lista
 *     (erro de compilação).
 *   · O teste `test/criteria-registry.test.ts` afirma que `PASSES` e `CRITERION_IDS` descrevem
 *     EXATAMENTE o mesmo conjunto → um pass novo obriga a atualizar esta lista.
 *   · A UI consome `Record<CriterionId, …>` → um id novo obriga a escrever a copy editorial
 *     antes de compilar.
 *
 * Este arquivo NÃO importa nada (é a base da cadeia de tipos: `criteria.ts` ← `types.ts` ←
 * passes ← `registry.ts`), então não há ciclo.
 *
 * A ordem aqui é só de leitura humana; o conjunto é o que importa (o teste compara SETS).
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

/** Id estável de um critério do linter — a união derivada de `CRITERION_IDS`. */
export type CriterionId = (typeof CRITERION_IDS)[number];

/** Narrowing de `string` para `CriterionId` — útil quando o id vem de dado dinâmico. */
export function isCriterionId(value: string): value is CriterionId {
  return (CRITERION_IDS as readonly string[]).includes(value);
}
