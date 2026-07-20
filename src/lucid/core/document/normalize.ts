/**
 * Normalização de entrada — chamada exatamente uma vez, no início do pipeline
 * (docs/ARQUITETURA.md §1, nota sobre I2, item 2; e §7, passo 1).
 *
 * A partir daqui, `Document.source` é sempre o texto já normalizado (NFC), e todo
 * offset em qualquer `Finding`/`Span`/`Sentence` do resto do pipeline é relativo a
 * ESTE texto — nunca ao texto bruto de entrada do usuário.
 */
export function normalize(text: string): string {
  return text.normalize("NFC");
}
