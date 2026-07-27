import { normalize } from "../document/normalize";
import type { Span } from "../types";
import type { BriefingCheck, BriefingCoverage, ReaderBriefing } from "./types";

const RE_WORD = /[\p{L}\p{N}]/u;
const RE_SPACE = /\s/u;

interface Folded {
  readonly text: string;
  readonly starts: readonly number[];
  readonly ends: readonly number[];
}

function fold(source: string): Folded {
  const text: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];

  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (RE_SPACE.test(char)) {
      const start = i;
      while (i < source.length && RE_SPACE.test(source[i])) i++;
      text.push(" ");
      starts.push(start);
      ends.push(i);
      continue;
    }
    const lower = char.toLowerCase();
    for (const piece of lower) {
      text.push(piece);
      starts.push(i);
      ends.push(i + 1);
    }
    i++;
  }

  return { text: text.join(""), starts, ends };
}

function foldNeedle(expression: string): string {
  return fold(normalize(expression)).text.trim();
}

function isBoundary(folded: string, index: number): boolean {
  if (index < 0 || index >= folded.length) return true;
  return !RE_WORD.test(folded[index]);
}

function occurrencesOf(source: string, haystack: Folded, needle: string): Span[] {
  const spans: Span[] = [];
  if (needle.length === 0) return spans;

  let from = 0;
  for (;;) {
    const at = haystack.text.indexOf(needle, from);
    if (at === -1) return spans;
    from = at + 1;

    if (!isBoundary(haystack.text, at - 1)) continue;
    if (!isBoundary(haystack.text, at + needle.length)) continue;

    const start = haystack.starts[at];
    const end = haystack.ends[at + needle.length - 1];
    spans.push({ start, end, text: source.slice(start, end) });
  }
}

export function isBriefingDeclared(briefing: ReaderBriefing): boolean {
  return (
    briefing.audience.trim() !== "" ||
    briefing.purpose.trim() !== "" ||
    briefing.priorKnowledge.trim() !== "" ||
    briefing.mustFind.some((expression) => expression.trim() !== "")
  );
}

export function checkBriefing(text: string, briefing: ReaderBriefing): BriefingCheck {
  const source = normalize(text);
  const haystack = fold(source);

  const coverage: BriefingCoverage[] = [];
  for (const expression of briefing.mustFind) {
    const trimmed = expression.trim();
    if (trimmed === "") continue;
    coverage.push({ expression: trimmed, occurrences: occurrencesOf(source, haystack, foldNeedle(trimmed)) });
  }

  return {
    declared: isBriefingDeclared(briefing),
    answered: {
      audience: briefing.audience.trim() !== "",
      purpose: briefing.purpose.trim() !== "",
      priorKnowledge: briefing.priorKnowledge.trim() !== "",
    },
    coverage,
    missing: coverage.filter((item) => item.occurrences.length === 0).map((item) => item.expression),
  };
}
