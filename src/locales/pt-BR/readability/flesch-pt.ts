import type {
  Metrics,
  ReadabilityAnomaly,
  ReadabilityBand,
  ReadabilityReading,
  ReadabilityScalePosition,
} from "@/lucid/core/types";

export function calculateFleschPt(wordsPerSentence: number, syllablesPerWord: number): number {
  return 248.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}

/**
 * INTERVALO DE REFERÊNCIA — convenção de leitura, NÃO domínio da fórmula.
 *
 * A fórmula não é limitada a 0–100: com `spw ≥ 1` e `wps ≥ 1` seu teto real é
 * 248,835 − 1,015 − 84,6 ≈ 163,2, e ela desce sem piso conforme a frase cresce.
 * Valores em 100–163 são frases curtas e simples; valores negativos são período longo
 * de palavra longa — juridiquês real mede −24,6 nesta engine. Nenhum dos dois é
 * anomalia, e nenhum dos dois é truncado: a engine não altera o que mediu.
 */
const REFERENCE_RANGE = { min: 0, max: 100 } as const;

/**
 * FAIXAS — convenção. São as quatro faixas que a literatura Flesch usa, sobre a escala
 * adaptada de Martins et al. (1996). O mapeamento faixa→escolaridade que circula junto
 * NÃO foi conferido no artigo original e por isso não é citado aqui nem na UI: o rótulo
 * diz posição na escala, não nível de leitor. Fronteira fechada acima (75 pertence à
 * faixa mais alta), para o corte ser determinístico.
 */
const BANDS: readonly ReadabilityBand[] = [
  { id: "very_easy", min: 75, max: 100, label: "muito fácil" },
  { id: "easy", min: 50, max: 75, label: "fácil" },
  { id: "hard", min: 25, max: 50, label: "difícil" },
  { id: "very_hard", min: 0, max: 25, label: "muito difícil" },
];

/*
 * LIMIARES DE ANOMALIA
 *
 * Martins et al. (1996) não publica faixa de validade da fórmula. Logo, todo limiar
 * abaixo é convenção declarada do Lucid, exposta aqui para poder ser contestada — e
 * cada um é uma causa NOMEADA, nunca um "fora do domínio" genérico. Uma anomalia
 * jamais esconde o valor: ela diz por que aquele valor não descreve o texto.
 */

/**
 * `syllables_per_word_impossible` — o único limiar com base dura, não convencional.
 *
 * A média de um conjunto não pode exceder o seu máximo. A palavra mais longa atestada
 * em português — *pneumoultramicroscopicossilicovulcanoconiótico* — conta 18 sílabas
 * por `countSyllables` (pinado em teste). Uma MÉDIA acima de 20 (margem de 2 sílabas
 * para neologismo mais longo) implica, por aritmética, que ao menos um token do texto
 * não é palavra do português: entrada degenerada, não texto difícil.
 */
const MAX_PLAUSIBLE_SYLLABLES_PER_WORD = 20;

/**
 * `sentence_boundary_missing` — convenção.
 *
 * `sentenceLength.errorAbove` é 30 palavras. Uma MÉDIA acima de 100 significa que o
 * documento inteiro tem frases de mais de 3× o limiar de erro, ou que a segmentação não
 * encontrou fronteira nenhuma (o caso comum: colagem de PDF com a pontuação perdida).
 * Nos dois casos a média não descreve o texto corrido sobre o qual a fórmula foi
 * regredida — e o segundo é informação acionável sobre a ENTRADA, não cosmético.
 */
const MAX_PLAUSIBLE_WORDS_PER_SENTENCE = 100;

/**
 * `small_sample` — convenção.
 *
 * A fórmula é uma regressão sobre texto corrido; com poucas palavras um único token
 * domina as duas médias. Medido nesta engine: "Eu fui." = 162,2 e "Ele é bom." = 133 —
 * uma palavra move o índice 29 pontos (pinado em teste). 20 é o mesmo número de
 * `sentenceLength.warnAbove`, reusado para não introduzir constante nova no código;
 * NÃO vem de Martins et al. e não pretende ter respaldo estatístico.
 */
const MIN_INTERPRETABLE_WORDS = 20;

function bandFor(value: number): ReadabilityBand | null {
  return BANDS.find((b) => value >= b.min) ?? null;
}

function positionOf(value: number): ReadabilityScalePosition {
  if (value > REFERENCE_RANGE.max) return "above_range";
  if (value < REFERENCE_RANGE.min) return "below_range";
  return "in_range";
}

/**
 * Interpreta sem alterar. Ordem das anomalias FIXA (degeneração da entrada primeiro,
 * tamanho de amostra depois) para a saída ser determinística como o resto da Camada 1.
 */
export function interpretFleschPt(metrics: Metrics): ReadabilityReading {
  if (metrics.fleschPt === null) {
    // Palavras primeiro: "!!! ???" tem fronteira de frase e nenhuma palavra.
    return { kind: "unmeasurable", cause: metrics.words === 0 ? "no_words" : "no_sentences" };
  }

  const anomalies: ReadabilityAnomaly[] = [];
  if (metrics.syllablesPerWord > MAX_PLAUSIBLE_SYLLABLES_PER_WORD) {
    anomalies.push({
      cause: "syllables_per_word_impossible",
      syllablesPerWord: metrics.syllablesPerWord,
      threshold: MAX_PLAUSIBLE_SYLLABLES_PER_WORD,
    });
  }
  if (metrics.wordsPerSentence > MAX_PLAUSIBLE_WORDS_PER_SENTENCE) {
    anomalies.push({
      cause: "sentence_boundary_missing",
      wordsPerSentence: metrics.wordsPerSentence,
      threshold: MAX_PLAUSIBLE_WORDS_PER_SENTENCE,
    });
  }
  if (metrics.words < MIN_INTERPRETABLE_WORDS) {
    anomalies.push({ cause: "small_sample", words: metrics.words, threshold: MIN_INTERPRETABLE_WORDS });
  }

  const position = positionOf(metrics.fleschPt);
  return {
    kind: "measured",
    value: metrics.fleschPt,
    position,
    // Fora do intervalo de referência não existe faixa — só posição. Chamar 162,2 de
    // "muito fácil" ou −8296,8 de "muito difícil" seria interpretar além do que a
    // escala define.
    band: position === "in_range" ? bandFor(metrics.fleschPt) : null,
    anomalies,
  };
}

export const READABILITY_REFERENCE_RANGE = REFERENCE_RANGE;
