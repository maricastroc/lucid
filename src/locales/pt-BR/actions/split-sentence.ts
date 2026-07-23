import type { Span } from "@/lucid/core/types";
import { normalize } from "@/lucid/core/document/normalize";
import { tokenize } from "@/lucid/core/document/tokenize";

const RE_LETTER = /\p{L}/u;

const COORD_CONJUNCTIONS: ReadonlySet<string> = new Set([
  "e",
  "mas",
  "porém",
  "ou",
  "contudo",
  "todavia",
  "entretanto",
  "pois",
  "portanto",
  "logo",
]);

const STRONG_PUNCTUATION: Record<string, SplitKind> = {
  ";": "semicolon",
  "—": "dash",
};

export type SplitKind = "semicolon" | "dash" | "comma_conjunction";

export interface SplitPoint {
  offset: number;
  kind: SplitKind;
  marker: string;
  before: string;
  after: string;
}

const PREVIEW_CHARS = 32;
const MAX_POINTS = 6;

function flat(s: string): string {
  return s.replace(/\s+/gu, " ").trim();
}

function firstLetterFrom(source: string, from: number, limit: number): number {
  let i = from;
  while (i < limit && !RE_LETTER.test(source[i])) i++;
  return i < limit ? i : -1;
}

export function clauseSplitPoints(text: string, span: Span): SplitPoint[] {
  const source = normalize(text);
  const tokens = tokenize(source).filter((t) => t.start >= span.start && t.end <= span.end);

  const points: SplitPoint[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isWord) continue;

    let kind: SplitKind | null = null;
    let marker = "";

    if (token.text in STRONG_PUNCTUATION) {
      kind = STRONG_PUNCTUATION[token.text];
      marker = token.text;
    } else if (token.text === ",") {
      const next = tokens[i + 1];
      const hasContentAfterConjunction = tokens.slice(i + 2).some((t) => t.isWord);
      if (next?.isWord && COORD_CONJUNCTIONS.has(next.lower) && hasContentAfterConjunction) {
        kind = "comma_conjunction";
        marker = next.text;
      }
    }

    if (!kind) continue;

    const hasWordBefore = tokens.slice(0, i).some((t) => t.isWord);
    const nextLetter = firstLetterFrom(source, token.start + 1, span.end);
    if (!hasWordBefore || nextLetter < 0) continue;

    const offset = token.start;
    if (seen.has(offset)) continue;
    seen.add(offset);

    points.push({
      offset,
      kind,
      marker,
      before: flat(source.slice(Math.max(span.start, offset - PREVIEW_CHARS), offset)),
      after: flat(source.slice(nextLetter, Math.min(span.end, nextLetter + PREVIEW_CHARS))),
    });

    if (points.length >= MAX_POINTS) break;
  }

  return points;
}

