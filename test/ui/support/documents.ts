/**
 * Small documents, one per shape a flow needs. The app's own sample is 760 words: analysing it on
 * every render would make the DOM suite slow without adding coverage.
 */

/**
 * Two findings in the first sentence — a passive voice and a jargon term with a curated
 * equivalent — plus a number, which the rewrite verification checks for.
 */
export const PASSIVE_AND_JARGON =
  "O pedido foi indeferido pela comissão por falta dos 3 documentos supracitados. " +
  "O prazo para recorrer é de dez dias.";

/** A rewrite of the first sentence that clears every proof and leaves the document with no finding. */
export const PLAIN_FIRST_SENTENCE = "A comissão negou o pedido porque faltaram os 3 documentos citados acima.";

/** The same rewrite with the number dropped — fails `numbers_preserved`, so the engine blocks it. */
export const REWRITE_LOSING_THE_NUMBER = "A comissão negou o pedido porque faltaram os documentos citados acima.";

/** One declared expression appearing twice, for stepping through occurrences. */
export const TERM_TWICE =
  "O prazo para recorrer é de dez dias. Perdido o prazo, o pedido foi indeferido pela comissão.";

/** Two occurrences of the same criterion, for stepping between points inside one criterion. */
export const TWO_PASSIVES =
  "O pedido foi indeferido pela comissão. O recurso foi negado pelo relator em segunda instância.";
