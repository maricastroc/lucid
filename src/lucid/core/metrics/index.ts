/**
 * Cálculo de métricas do documento (docs/ARQUITETURA.md §7 passo 4, §9 Fase 1 item 4).
 *
 * Todo cálculo interno usa floats brutos — inclusive a própria fórmula do Flesch-PT, que
 * recebe `palavrasPorFrase`/`silabasPorPalavra` NÃO-arredondados, para não compor erro
 * de arredondamento. O arredondamento acontece uma única vez, aqui, na fronteira de
 * saída, aplicado independentemente a cada um dos três campos derivados
 * (`palavrasPorFrase`, `silabasPorPalavra`, `fleschPt`) — nunca antes (I2, nota 1 de
 * docs/ARQUITETURA.md §1). Os totais inteiros (`palavras`, `frases`, `silabas`) nunca
 * são arredondados, por já serem contagens exatas.
 */
import type { Config } from "../config";
import { DEFAULT_CONFIG } from "../config";
import type { Document, Metricas } from "../types";
import { countSyllables } from "../document/syllables";
import { calcularFleschPt } from "./flesch-pt";

function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/**
 * Documento vazio (ou sem nenhuma frase/palavra) devolve todas as métricas zeradas —
 * nunca NaN/Infinity, e nunca o valor "de repouso" da fórmula do Flesch (que, com
 * médias zeradas, daria 248.835 — um número que sugeriria uma nota de leiturabilidade
 * para um texto que não existe). Tratamento explícito de divisão por zero (requisito 6).
 */
function metricasZeradas(frases: number, palavras: number, silabas: number): Metricas {
  return { fleschPt: 0, palavras, frases, silabas, palavrasPorFrase: 0, silabasPorPalavra: 0 };
}

export function runMetrics(doc: Document, config: Config = DEFAULT_CONFIG): Metricas {
  const frases = doc.sentences.length;
  const tokensPalavra = doc.tokens.filter((t) => t.isWord);
  const palavras = tokensPalavra.length;
  const silabas = tokensPalavra.reduce((soma, t) => soma + countSyllables(t.text), 0);

  if (frases === 0 || palavras === 0) {
    return metricasZeradas(frases, palavras, silabas);
  }

  const palavrasPorFraseBruto = palavras / frases;
  const silabasPorPalavraBruto = silabas / palavras;
  const fleschPtBruto = calcularFleschPt(palavrasPorFraseBruto, silabasPorPalavraBruto);

  const casas = config.metrics.decimais;

  return {
    fleschPt: arredondar(fleschPtBruto, casas),
    palavras,
    frases,
    silabas,
    palavrasPorFrase: arredondar(palavrasPorFraseBruto, casas),
    silabasPorPalavra: arredondar(silabasPorPalavraBruto, casas),
  };
}
