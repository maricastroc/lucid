/**
 * Índice de leiturabilidade Flesch-PT — adaptação de Martins et al. (1996) para o
 * português, NÃO a fórmula original em inglês (docs/ARQUITETURA.md §6.5).
 *
 *   FLESCH-PT = 248.835 − 1.015 × (palavras/frases) − 84.6 × (sílabas/palavras)
 *
 * A fórmula inglesa (Flesch Reading Ease, 1948) usa a constante 206.835; Martins et al.
 * recalibraram só o termo constante para o português (248.835), mantendo os
 * coeficientes de palavras/frase (1.015) e sílabas/palavra (84.6) — citação padrão na
 * literatura brasileira de leiturabilidade (grupo NILC/PorSimples, Aluísio et al.; ver
 * CLAUDE.md, seção "Referência de domínio").
 *
 * Função pura: opera sobre médias JÁ calculadas, não faz arredondamento — isso acontece
 * só na fronteira de saída, em `metrics/index.ts` (I2, nota 1 — docs/ARQUITETURA.md §1).
 *
 * Como qualquer métrica de leiturabilidade (§6.5 / Princípio 4 da norma), este número é
 * sinal de apoio, nunca aprovação — não existe leitura de "aprovado"/"reprovado" aqui
 * nem em nenhum lugar que consome este valor.
 */
export function calculateFleschPt(wordsPerSentence: number, syllablesPerWord: number): number {
  return 248.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}
