/**
 * Cálculo de métricas do documento (docs/ARQUITETURA.md §7 passo 4, §9 Fase 1 item 4).
 *
 * Todo cálculo interno usa floats brutos — inclusive a própria fórmula do Flesch-PT, que
 * recebe `wordsPerSentence`/`syllablesPerWord` NÃO-arredondados, para não compor erro
 * de arredondamento. O arredondamento acontece uma única vez, aqui, na fronteira de
 * saída, aplicado independentemente a cada um dos três campos derivados
 * (`wordsPerSentence`, `syllablesPerWord`, `fleschPt`) — nunca antes (I2, nota 1 de
 * docs/ARQUITETURA.md §1). Os totais inteiros (`words`, `sentences`, `syllables`) nunca
 * são arredondados, por já serem contagens exatas.
 */
import type { Config } from "../config";
import { DEFAULT_CONFIG } from "../config";
import type { Document, Metrics } from "../types";
import { countSyllables } from "../document/syllables";
import { calculateFleschPt } from "./flesch-pt";

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

/**
 * Documento vazio (ou sem nenhuma frase/palavra) devolve todas as métricas zeradas —
 * nunca NaN/Infinity, e nunca o valor "de repouso" da fórmula do Flesch (que, com
 * médias zeradas, daria 248.835 — um número que sugeriria uma nota de leiturabilidade
 * para um texto que não existe). Tratamento explícito de divisão por zero (requisito 6).
 */
function zeroMetrics(sentenceCount: number, wordCount: number, syllableCount: number): Metrics {
  return {
    fleschPt: 0,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: 0,
    syllablesPerWord: 0,
  };
}

export function runMetrics(doc: Document, config: Config = DEFAULT_CONFIG): Metrics {
  const sentenceCount = doc.sentences.length;
  const wordTokens = doc.tokens.filter((t) => t.isWord);
  const wordCount = wordTokens.length;
  const syllableCount = wordTokens.reduce((sum, t) => sum + countSyllables(t.text), 0);

  if (sentenceCount === 0 || wordCount === 0) {
    return zeroMetrics(sentenceCount, wordCount, syllableCount);
  }

  const rawWordsPerSentence = wordCount / sentenceCount;
  const rawSyllablesPerWord = syllableCount / wordCount;
  const rawFleschPt = calculateFleschPt(rawWordsPerSentence, rawSyllablesPerWord);

  const decimalPlaces = config.metrics.decimalPlaces;

  return {
    fleschPt: round(rawFleschPt, decimalPlaces),
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    wordsPerSentence: round(rawWordsPerSentence, decimalPlaces),
    syllablesPerWord: round(rawSyllablesPerWord, decimalPlaces),
  };
}
