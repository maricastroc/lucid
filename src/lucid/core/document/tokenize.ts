/**
 * Tokenizador determinístico de palavras em PT-BR (docs/ARQUITETURA.md §7, passo 3).
 *
 * Regras + varredura de caracteres, zero-dep, zero análise morfológica pesada — mesmo
 * espírito de `segment-sentences.ts` (ADR-001 em docs/DECISOES.md). Opera sobre o
 * `source` JÁ normalizado (NFC) — ver `normalize.ts`; todo offset devolvido é relativo
 * a esse texto, nunca a um texto bruto.
 *
 * Política transversal (igual à da segmentação): em caso de dúvida, NÃO mesclar —
 * produzir um token de pontuação separado é sempre seguro; mesclar errado corrompe a
 * palavra. As três extensões de palavra (hífen, apóstrofo, ponto de sigla) só se aplicam
 * quando o padrão é inequívoco (letra imediatamente dos dois lados, sem espaço).
 */
import type { Sentence, Token } from "../types";

const RE_LETTER = /\p{L}/u;
const RE_DIGIT = /\p{Nd}/u;
const RE_SPACE = /\s/u;

/**
 * Cadeia de letras únicas separadas por ponto (ex.: "E", "E.U", "E.U.A"). Usada para
 * decidir se um "." em andamento continua formando uma sigla grudada (E.U.A.) — nunca
 * para abreviações multiletra (Sr., art., p.ex.), que exigem exatamente 1 letra por
 * segmento e por isso não casam aqui.
 */
const RE_ACRONYM_CHAIN = /^\p{L}(\.\p{L})*$/u;

/** Pontuação de borda removida da ponta de URLs/e-mails para não engolir o fim da frase. */
const BOUNDARY_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?", ")", "]", "}", "'", '"', "’", "”", "»"]);

const RE_URL = /(?:https?:\/\/|www\.)\S+/uy;
const RE_EMAIL = /[\p{L}\p{Nd}._%+-]+@[\p{L}\p{Nd}.-]+\.[\p{L}]{2,}/uy;

function trimBoundaryPunctuation(source: string, start: number, rawEnd: number): number {
  let end = rawEnd;
  while (end > start && BOUNDARY_PUNCTUATION.has(source[end - 1])) {
    end--;
  }
  return end;
}

function matchUrl(source: string, i: number): number | null {
  RE_URL.lastIndex = i;
  const m = RE_URL.exec(source);
  if (!m) return null;
  const end = trimBoundaryPunctuation(source, i, i + m[0].length);
  return end > i ? end : null;
}

function matchEmail(source: string, i: number): number | null {
  RE_EMAIL.lastIndex = i;
  const m = RE_EMAIL.exec(source);
  if (!m) return null;
  const end = trimBoundaryPunctuation(source, i, i + m[0].length);
  return end > i ? end : null;
}

/** Consome um número: dígitos, com "." ou "," internos só quando têm dígito nos dois lados. */
function matchNumber(source: string, i: number): number {
  let j = i;
  while (j < source.length && RE_DIGIT.test(source[j])) j++;

  while (true) {
    const separator = source[j];
    const hasDigitAfter = j + 1 < source.length && RE_DIGIT.test(source[j + 1]);
    if ((separator === "." || separator === ",") && hasDigitAfter) {
      j++;
      while (j < source.length && RE_DIGIT.test(source[j])) j++;
    } else {
      break;
    }
  }

  return j;
}

/**
 * Consome uma palavra a partir de uma letra inicial, tentando estender por hífen,
 * apóstrofo ou ponto-de-sigla — cada extensão só é aceita quando inequívoca (letra
 * imediatamente após o caractere de ligação, sem espaço).
 */
function matchWord(source: string, i: number): number {
  let j = i;
  while (j < source.length && RE_LETTER.test(source[j])) j++;

  while (j < source.length) {
    const c = source[j];

    if (c === "-" && j + 1 < source.length && RE_LETTER.test(source[j + 1])) {
      j++;
      while (j < source.length && RE_LETTER.test(source[j])) j++;
      continue;
    }

    if ((c === "'" || c === "’") && j + 1 < source.length && RE_LETTER.test(source[j + 1])) {
      j++;
      while (j < source.length && RE_LETTER.test(source[j])) j++;
      continue;
    }

    if (c === ".") {
      let k = j + 1;
      while (k < source.length && RE_LETTER.test(source[k])) k++;
      if (k > j + 1) {
        const candidate = source.slice(i, k);
        if (RE_ACRONYM_CHAIN.test(candidate)) {
          j = k;
          continue;
        }
      }
    }

    break;
  }

  return j;
}

function createToken(source: string, start: number, end: number, isWord: boolean): Token {
  const text = source.slice(start, end);
  return { text, lower: text.toLowerCase(), start, end, isWord };
}

/**
 * Tokeniza `source` (texto JÁ normalizado) em uma lista achatada, em ordem de leitura.
 * Determinístico: mesma entrada produz sempre a mesma lista.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const length = source.length;
  let i = 0;

  while (i < length) {
    const ch = source[i];

    if (RE_SPACE.test(ch)) {
      i++;
      continue;
    }

    const urlEnd = matchUrl(source, i);
    if (urlEnd !== null) {
      tokens.push(createToken(source, i, urlEnd, false));
      i = urlEnd;
      continue;
    }

    const emailEnd = matchEmail(source, i);
    if (emailEnd !== null) {
      tokens.push(createToken(source, i, emailEnd, false));
      i = emailEnd;
      continue;
    }

    if (RE_DIGIT.test(ch)) {
      const end = matchNumber(source, i);
      tokens.push(createToken(source, i, end, false));
      i = end;
      continue;
    }

    if (RE_LETTER.test(ch)) {
      const end = matchWord(source, i);
      tokens.push(createToken(source, i, end, true));
      i = end;
      continue;
    }

    // pontuação/símbolo isolado — nunca conta como palavra.
    tokens.push(createToken(source, i, i + 1, false));
    i++;
  }

  return tokens;
}

/**
 * Distribui os tokens achatados (mesma origem de offsets que as frases) para cada
 * `Sentence`, preenchendo `tokens` e `wordCount` (contagem de tokens com `isWord`).
 * Como frases nunca contêm espaço nas bordas (já aparadas por `segmentSentences`) e
 * tokens nunca atravessam espaço, todo token cai inteiramente dentro de exatamente uma
 * frase — não há necessidade de tratar tokens "órfãos".
 */
export function attachTokens(sentences: readonly Sentence[], tokens: readonly Token[]): Sentence[] {
  return sentences.map((sentence) => {
    const sentenceTokens = tokens.filter((t) => t.start >= sentence.start && t.end <= sentence.end);
    const wordCount = sentenceTokens.reduce((total, t) => total + (t.isWord ? 1 : 0), 0);
    return { ...sentence, tokens: sentenceTokens, wordCount };
  });
}
