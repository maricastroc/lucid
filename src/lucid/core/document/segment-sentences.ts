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
import { getPrepared } from "../data/registry";

// Estágio de documento (fora do pipeline de passes) → lê o preparado direto do registry.
const ABBREVIATIONS: ReadonlySet<string> = getPrepared("abreviacoes.pt");

/** `.`, `!`, `?`, `…` — pontuação capaz de fechar uma frase. */
const TERMINAL_MARKS = new Set([".", "!", "?", "…"]);

/** Aspas/parênteses de fechamento que podem vir logo após a pontuação terminal. */
const CLOSING_MARKS = new Set(['"', "'", "”", "’", "»", ")", "]"]);

const RE_LETTER = /\p{L}/u;
const RE_UPPERCASE = /\p{Lu}/u;
const RE_DIGIT = /\p{Nd}/u;
const RE_SPACE = /\s/u;

/** Aberturas de aspas/parênteses — sinal de que uma nova frase (ex.: diálogo) começa. */
const NEXT_OPENING_MARKS = new Set(['"', "'", "“", "«", "(", "["]);

interface ClosingResult {
  /** true quando os sinais são inequívocos o bastante para confirmar a fronteira. */
  confirmed: boolean;
  /** offset (exclusivo) logo após a pontuação/fechamentos absorvidos — sempre calculado. */
  absorbedEnd: number;
}

/**
 * A partir de `absorptionStart` (posição logo após a marca terminal inicial), absorve
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
function tryCloseSentence(source: string, absorptionStart: number): ClosingResult {
  let j = absorptionStart;
  while (j < source.length && (TERMINAL_MARKS.has(source[j]) || CLOSING_MARKS.has(source[j]))) {
    j++;
  }

  if (j >= source.length) {
    return { confirmed: true, absorbedEnd: j };
  }

  let k = j;
  while (k < source.length && RE_SPACE.test(source[k])) {
    k++;
  }

  if (k === j) {
    // pontuação colada no próximo caractere, sem separação — ambíguo, não confirma.
    return { confirmed: false, absorbedEnd: j };
  }

  if (k === source.length) {
    return { confirmed: true, absorbedEnd: j };
  }

  const next = source[k];
  const confirmed = RE_UPPERCASE.test(next) || RE_DIGIT.test(next) || NEXT_OPENING_MARKS.has(next);

  return { confirmed, absorbedEnd: j };
}

/** Extrai a maior sequência de letras imediatamente antes de `position` (exclusive). */
function precedingWord(source: string, position: number): string {
  let start = position;
  while (start > 0 && RE_LETTER.test(source[start - 1])) {
    start--;
  }
  return source.slice(start, position);
}

/**
 * Varre `source` (já normalizado) e retorna os offsets (exclusivos) onde uma frase
 * termina de fato — só os que passaram pela confirmação conservadora acima.
 */
function findBoundaries(source: string): number[] {
  const boundaries: number[] = [];
  const length = source.length;
  let i = 0;

  while (i < length) {
    const ch = source[i];

    if (ch === ".") {
      if (source[i + 1] === ".") {
        // corrida de 2+ pontos: reticências digitadas como "..", "...", "....".
        let j = i;
        while (source[j] === ".") j++;
        const result = tryCloseSentence(source, j);
        if (result.confirmed) boundaries.push(result.absorbedEnd);
        i = result.absorbedEnd;
        continue;
      }

      const digitBefore = i > 0 && RE_DIGIT.test(source[i - 1]);
      const digitAfter = i + 1 < length && RE_DIGIT.test(source[i + 1]);
      if (digitBefore && digitAfter) {
        // separador decimal ou de milhar (ex.: "1.234,56") — nunca é candidato.
        i++;
        continue;
      }

      const word = precedingWord(source, i);
      if (word.length > 0 && ABBREVIATIONS.has(word.toLowerCase())) {
        // abreviação conhecida (ex.: "Sr.", "art.", "p.ex.") — nunca fecha frase.
        i++;
        continue;
      }
      if (word.length === 1 && RE_UPPERCASE.test(word)) {
        // letra maiúscula isolada antes do ponto — sigla ou iniciais (ex.: "E.U.A.",
        // "J. K. Rowling"). Política conservadora: nunca fecha frase aqui, mesmo que
        // isso una com a frase seguinte em casos raros de sigla no fim do parágrafo.
        i++;
        continue;
      }

      const result = tryCloseSentence(source, i + 1);
      if (result.confirmed) boundaries.push(result.absorbedEnd);
      i = result.absorbedEnd;
      continue;
    }

    if (ch === "!" || ch === "?" || ch === "…") {
      const result = tryCloseSentence(source, i + 1);
      if (result.confirmed) boundaries.push(result.absorbedEnd);
      i = result.absorbedEnd;
      continue;
    }

    i++;
  }

  return boundaries;
}

/**
 * Segmenta `source` (texto JÁ normalizado — ver `normalize.ts`) em frases.
 *
 * Determinístico: mesma entrada produz sempre a mesma lista, na mesma ordem
 * (ordem de leitura, que já é a ordem de offsets crescentes).
 */
export function segmentSentences(source: string): Sentence[] {
  const boundaries = findBoundaries(source);
  const cuts = [0, ...boundaries, source.length];

  const sentences: Sentence[] = [];
  for (let idx = 0; idx < cuts.length - 1; idx++) {
    const rawStart = cuts[idx];
    const rawEnd = cuts[idx + 1];
    if (rawStart >= rawEnd) continue;

    let start = rawStart;
    while (start < rawEnd && RE_SPACE.test(source[start])) start++;

    let end = rawEnd;
    while (end > start && RE_SPACE.test(source[end - 1])) end--;

    if (start >= end) continue; // segmento inteiramente em branco (ex.: linhas vazias)

    sentences.push({
      text: source.slice(start, end),
      start,
      end,
      // placeholders intencionais — ver comentário de topo do arquivo.
      tokens: [],
      wordCount: 0,
    });
  }

  return sentences;
}
