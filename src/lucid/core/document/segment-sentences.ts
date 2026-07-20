/**
 * Segmentador determinístico de frases em PT-BR (docs/ARQUITETURA.md §6.0).
 *
 * Regras + léxico, zero-dep, zero análise morfológica pesada. Política transversal:
 * **em caso de dúvida, juntar em vez de quebrar** — um falso positivo de quebra corrompe
 * a leitura do texto (uma "frase" que na verdade é metade de outra); uma frase mais longa
 * do que o ideal, no pior caso, só aciona o critério de comprimento mais tarde. Nunca
 * corrompe offsets.
 *
 * Esta função NÃO faz tokenização por palavra — só segmentação. Por isso, cada
 * `Sentence` que ela produz sai com `tokens: []` e `wordCount: 0`: são placeholders só
 * para satisfazer o contrato de tipo de `core/types.ts` quando `segmentSentences` é
 * chamada isoladamente. Quem monta o `Document` de verdade (`buildDocument`, em
 * `model.ts`) chama `tokenize.ts` + `attachTokens()` logo em seguida para preencher os
 * dois campos com dados reais — ver `model.ts` e docs/ARQUITETURA.md §7.
 */
import type { Sentence } from "../types";
import abreviacoesData from "../../data/abreviacoes.pt.json";

const ABREVIACOES: ReadonlySet<string> = new Set(abreviacoesData.abreviacoes);

/** `.`, `!`, `?`, `…` — pontuação capaz de fechar uma frase. */
const MARCAS_TERMINAIS = new Set([".", "!", "?", "…"]);

/** Aspas/parênteses de fechamento que podem vir logo após a pontuação terminal. */
const MARCAS_FECHAMENTO = new Set(['"', "'", "”", "’", "»", ")", "]"]);

const RE_LETRA = /\p{L}/u;
const RE_MAIUSCULA = /\p{Lu}/u;
const RE_DIGITO = /\p{Nd}/u;
const RE_ESPACO = /\s/u;

/** Aberturas de aspas/parênteses — sinal de que uma nova frase (ex.: diálogo) começa. */
const MARCAS_ABERTURA_SEGUINTE = new Set(['"', "'", "“", "«", "(", "["]);

interface ResultadoFechamento {
  /** true quando os sinais são inequívocos o bastante para confirmar a fronteira. */
  confirmado: boolean;
  /** offset (exclusivo) logo após a pontuação/fechamentos absorvidos — sempre calculado. */
  fimAbsorvido: number;
}

/**
 * A partir de `inicioAbsorcao` (posição logo após a marca terminal inicial), absorve
 * qualquer sequência adicional de pontuação terminal e marcas de fechamento (cobre
 * combinações como `?!`, `!"`, `."` etc.), e então decide se a fronteira é confirmada:
 *
 * - fim do texto → confirmado;
 * - sem espaço algum logo em seguida (pontuação colada no próximo caractere) → NÃO
 *   confirmado (política conservadora: juntar);
 * - espaço seguido de fim de texto → confirmado;
 * - espaço seguido de maiúscula, dígito, ou abertura de aspas/parênteses → confirmado;
 * - qualquer outro caso → NÃO confirmado (juntar).
 */
function tentarFecharFrase(source: string, inicioAbsorcao: number): ResultadoFechamento {
  let j = inicioAbsorcao;
  while (j < source.length && (MARCAS_TERMINAIS.has(source[j]) || MARCAS_FECHAMENTO.has(source[j]))) {
    j++;
  }

  if (j >= source.length) {
    return { confirmado: true, fimAbsorvido: j };
  }

  let k = j;
  while (k < source.length && RE_ESPACO.test(source[k])) {
    k++;
  }

  if (k === j) {
    // pontuação colada no próximo caractere, sem separação — ambíguo, não confirma.
    return { confirmado: false, fimAbsorvido: j };
  }

  if (k === source.length) {
    return { confirmado: true, fimAbsorvido: j };
  }

  const proximo = source[k];
  const confirmado = RE_MAIUSCULA.test(proximo) || RE_DIGITO.test(proximo) || MARCAS_ABERTURA_SEGUINTE.has(proximo);

  return { confirmado, fimAbsorvido: j };
}

/** Extrai a maior sequência de letras imediatamente antes de `posicao` (exclusive). */
function palavraAnterior(source: string, posicao: number): string {
  let inicio = posicao;
  while (inicio > 0 && RE_LETRA.test(source[inicio - 1])) {
    inicio--;
  }
  return source.slice(inicio, posicao);
}

/**
 * Varre `source` (já normalizado) e retorna os offsets (exclusivos) onde uma frase
 * termina de fato — só os que passaram pela confirmação conservadora acima.
 */
function encontrarFronteiras(source: string): number[] {
  const fronteiras: number[] = [];
  const tamanho = source.length;
  let i = 0;

  while (i < tamanho) {
    const ch = source[i];

    if (ch === ".") {
      if (source[i + 1] === ".") {
        // corrida de 2+ pontos: reticências digitadas como "..", "...", "....".
        let j = i;
        while (source[j] === ".") j++;
        const resultado = tentarFecharFrase(source, j);
        if (resultado.confirmado) fronteiras.push(resultado.fimAbsorvido);
        i = resultado.fimAbsorvido;
        continue;
      }

      const digitoAntes = i > 0 && RE_DIGITO.test(source[i - 1]);
      const digitoDepois = i + 1 < tamanho && RE_DIGITO.test(source[i + 1]);
      if (digitoAntes && digitoDepois) {
        // separador decimal ou de milhar (ex.: "1.234,56") — nunca é candidato.
        i++;
        continue;
      }

      const palavra = palavraAnterior(source, i);
      if (palavra.length > 0 && ABREVIACOES.has(palavra.toLowerCase())) {
        // abreviação conhecida (ex.: "Sr.", "art.", "p.ex.") — nunca fecha frase.
        i++;
        continue;
      }
      if (palavra.length === 1 && RE_MAIUSCULA.test(palavra)) {
        // letra maiúscula isolada antes do ponto — sigla ou iniciais (ex.: "E.U.A.",
        // "J. K. Rowling"). Política conservadora: nunca fecha frase aqui, mesmo que
        // isso una com a frase seguinte em casos raros de sigla no fim do parágrafo.
        i++;
        continue;
      }

      const resultado = tentarFecharFrase(source, i + 1);
      if (resultado.confirmado) fronteiras.push(resultado.fimAbsorvido);
      i = resultado.fimAbsorvido;
      continue;
    }

    if (ch === "!" || ch === "?" || ch === "…") {
      const resultado = tentarFecharFrase(source, i + 1);
      if (resultado.confirmado) fronteiras.push(resultado.fimAbsorvido);
      i = resultado.fimAbsorvido;
      continue;
    }

    i++;
  }

  return fronteiras;
}

/**
 * Segmenta `source` (texto JÁ normalizado — ver `normalize.ts`) em frases.
 *
 * Determinístico: mesma entrada produz sempre a mesma lista, na mesma ordem
 * (ordem de leitura, que já é a ordem de offsets crescentes).
 */
export function segmentSentences(source: string): Sentence[] {
  const fronteiras = encontrarFronteiras(source);
  const cortes = [0, ...fronteiras, source.length];

  const sentencas: Sentence[] = [];
  for (let idx = 0; idx < cortes.length - 1; idx++) {
    const brutoInicio = cortes[idx];
    const brutoFim = cortes[idx + 1];
    if (brutoInicio >= brutoFim) continue;

    let inicio = brutoInicio;
    while (inicio < brutoFim && RE_ESPACO.test(source[inicio])) inicio++;

    let fim = brutoFim;
    while (fim > inicio && RE_ESPACO.test(source[fim - 1])) fim--;

    if (inicio >= fim) continue; // segmento inteiramente em branco (ex.: linhas vazias)

    sentencas.push({
      text: source.slice(inicio, fim),
      start: inicio,
      end: fim,
      // placeholders intencionais — ver comentário de topo do arquivo.
      tokens: [],
      wordCount: 0,
    });
  }

  return sentencas;
}
