import { sha256 } from "./jsonl";

export interface RawPassage {
  start: number;
  end: number;
  text: string;
  words: number;
}

export interface SegmentOptions {
  minWords: number;
  maxWords: number;
}

export const DEFAULT_SEGMENT: SegmentOptions = { minWords: 12, maxWords: 140 };

export function countWords(text: string): number {
  const matches = text.replace(/[ºª°]/g, " ").match(/\p{L}[\p{L}\p{M}'-]*/gu);
  return matches === null ? 0 : matches.length;
}

export function segment(text: string, options: SegmentOptions = DEFAULT_SEGMENT): RawPassage[] {
  const passages: RawPassage[] = [];
  let cursor = 0;

  for (const block of text.split("\n")) {
    const start = cursor;
    cursor += block.length + 1;

    const leading = block.length - block.trimStart().length;
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;

    const words = countWords(trimmed);
    if (words < options.minWords || words > options.maxWords) continue;

    passages.push({
      start: start + leading,
      end: start + leading + trimmed.length,
      text: trimmed,
      words,
    });
  }

  return passages;
}

export function draw(seed: string, key: string): number {
  return Number.parseInt(sha256(`${seed}:${key}`).slice(0, 13), 16) / 2 ** 52;
}
