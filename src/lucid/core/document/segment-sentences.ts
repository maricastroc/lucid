import type { Sentence } from "../types";
import { getPrepared } from "../data/registry";

const ABBREVIATIONS: ReadonlySet<string> = getPrepared("abreviacoes.pt");

const TERMINAL_MARKS = new Set([".", "!", "?", "…"]);

const CLOSING_MARKS = new Set(['"', "'", "”", "’", "»", ")", "]"]);

const RE_LETTER = /\p{L}/u;
const RE_UPPERCASE = /\p{Lu}/u;
const RE_DIGIT = /\p{Nd}/u;
const RE_SPACE = /\s/u;

const NEXT_OPENING_MARKS = new Set(['"', "'", "“", "«", "(", "["]);

interface ClosingResult {
  confirmed: boolean;
  absorbedEnd: number;
}

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
    return { confirmed: false, absorbedEnd: j };
  }

  if (k === source.length) {
    return { confirmed: true, absorbedEnd: j };
  }

  const next = source[k];
  const confirmed = RE_UPPERCASE.test(next) || RE_DIGIT.test(next) || NEXT_OPENING_MARKS.has(next);

  return { confirmed, absorbedEnd: j };
}

function precedingWord(source: string, position: number): string {
  let start = position;
  while (start > 0 && RE_LETTER.test(source[start - 1])) {
    start--;
  }
  return source.slice(start, position);
}

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
        i++;
        continue;
      }

      const word = precedingWord(source, i);
      if (word.length > 0 && ABBREVIATIONS.has(word.toLowerCase())) {
        i++;
        continue;
      }
      if (word.length === 1 && RE_UPPERCASE.test(word)) {
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

    if (start >= end) continue;

    sentences.push({
      text: source.slice(start, end),
      start,
      end,
      tokens: [],
      wordCount: 0,
    });
  }

  return sentences;
}
