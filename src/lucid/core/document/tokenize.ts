import type { Sentence, Token } from "../types";

const RE_LETTER = /\p{L}/u;
const RE_DIGIT = /\p{Nd}/u;
const RE_SPACE = /\s/u;

const RE_ACRONYM_CHAIN = /^\p{L}(\.\p{L})*$/u;

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

    tokens.push(createToken(source, i, i + 1, false));
    i++;
  }

  return tokens;
}

export function attachTokens(sentences: readonly Sentence[], tokens: readonly Token[]): Sentence[] {
  return sentences.map((sentence) => {
    const sentenceTokens = tokens.filter((t) => t.start >= sentence.start && t.end <= sentence.end);
    const wordCount = sentenceTokens.reduce((total, t) => total + (t.isWord ? 1 : 0), 0);
    return { ...sentence, tokens: sentenceTokens, wordCount };
  });
}
