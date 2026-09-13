import type { ParagraphBlock, Pass, PassFinding, Sentence, Token } from "@/lucid/core/types";
import type { EnConfig } from "../config";

const CRITERION = "prose_enumeration";

type Scheme = "letter" | "roman" | "number";
export type EnumerationNotation = "markers" | "ordinals" | "series";

const LETTER_RANK: Readonly<Record<string, number>> = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 };
const ROMAN_RANK: Readonly<Record<string, number>> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
const ORDINAL_RANK: Readonly<Record<string, number>> = {
  first: 1,
  firstly: 1,
  second: 2,
  secondly: 2,
  third: 3,
  thirdly: 3,
  fourth: 4,
  fourthly: 4,
  fifth: 5,
  fifthly: 5,
  sixth: 6,
  sixthly: 6,
};
const RE_SMALL_NUMBER = /^\d{1,2}$/;
const CONJUNCTIONS = new Set(["and", "or"]);

const SCHEME_EXAMPLE: Readonly<Record<Scheme, string>> = {
  letter: "“(a)… (b)… (c)…”",
  roman: "“(i)… (ii)… (iii)…”",
  number: "“(1)… (2)… (3)…”",
};

function markerRanks(tokens: readonly Token[], index: number): Partial<Record<Scheme, number>> | null {
  const numeral = tokens[index];
  const closing = tokens[index + 1];
  if (closing?.text !== ")" || closing.start !== numeral.end) return null;

  const opening = tokens[index - 1];
  if (opening?.text === "(") {
    if (opening.end !== numeral.start) return null;
    const welded = tokens[index - 2];
    if (welded !== undefined && welded.end === opening.start) return null;
  } else if (opening !== undefined && opening.end === numeral.start) {
    return null;
  }

  if (RE_SMALL_NUMBER.test(numeral.text)) return { number: Number(numeral.text) };
  if (!numeral.isWord) return null;
  const ranks: Partial<Record<Scheme, number>> = {};
  if (numeral.lower in LETTER_RANK && numeral.text.length === 1) ranks.letter = LETTER_RANK[numeral.lower];
  if (numeral.lower in ROMAN_RANK) ranks.roman = ROMAN_RANK[numeral.lower];
  return Object.keys(ranks).length === 0 ? null : ranks;
}

function isSequence(ranks: ReadonlySet<number>, min: number): boolean {
  if (!ranks.has(1)) return false;
  for (let rank = 1; rank <= min; rank++) if (!ranks.has(rank)) return false;
  return true;
}

interface Detected {
  readonly notation: EnumerationNotation;
  readonly items: number;
  readonly start: number;
  readonly end: number;
  readonly scheme?: Scheme;
}

function markersIn(paragraph: ParagraphBlock, min: number): Detected | null {
  const ranks: Record<Scheme, Set<number>> = { letter: new Set(), roman: new Set(), number: new Set() };
  const first: Partial<Record<Scheme, number>> = {};
  const last: Partial<Record<Scheme, number>> = {};
  for (const sentence of paragraph.sentences) {
    for (let i = 0; i < sentence.tokens.length; i++) {
      const found = markerRanks(sentence.tokens, i);
      if (found === null) continue;
      for (const scheme of Object.keys(found) as Scheme[]) {
        ranks[scheme].add(found[scheme] as number);
        first[scheme] ??= sentence.tokens[i].start;
        last[scheme] = sentence.end;
      }
    }
  }
  for (const scheme of ["number", "roman", "letter"] as const) {
    if (!isSequence(ranks[scheme], min)) continue;
    return {
      notation: "markers",
      items: ranks[scheme].size,
      start: first[scheme] as number,
      end: last[scheme] as number,
      scheme,
    };
  }
  return null;
}

function ordinalsIn(paragraph: ParagraphBlock, min: number): Detected | null {
  const ranks = new Set<number>();
  let start: number | null = null;
  let end = paragraph.start;
  for (const sentence of paragraph.sentences) {
    const tokens = sentence.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.isWord || !(token.lower in ORDINAL_RANK)) continue;
      const sentenceInitial = tokens.slice(0, i).every((t) => !t.isWord);
      const followedByComma = tokens[i + 1]?.text === ",";
      if (!sentenceInitial && !followedByComma) continue;
      ranks.add(ORDINAL_RANK[token.lower]);
      start ??= token.start;
      end = sentence.end;
    }
  }
  if (start === null || !isSequence(ranks, min)) return null;
  return { notation: "ordinals", items: ranks.size, start, end };
}

function seriesIn(sentence: Sentence, min: number): Detected | null {
  const tokens = sentence.tokens;
  const colon = tokens.findIndex((t) => t.text === ":");
  if (colon < 0) return null;

  const items: Token[][] = [[]];
  let depth = 0;
  for (let i = colon + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.text === "(") depth += 1;
    if (token.text === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (token.text === "," || token.text === ";")) {
      items.push([]);
      continue;
    }
    if (depth === 0 && [".", "!", "?"].includes(token.text)) break;
    items[items.length - 1].push(token);
  }

  const lastItem = items[items.length - 1];
  const opensWithConjunction = lastItem[0]?.isWord === true && CONJUNCTIONS.has(lastItem[0].lower);
  if (!opensWithConjunction) {
    const split = lastItem.findLastIndex((t, index) => index > 0 && t.isWord && CONJUNCTIONS.has(t.lower));
    if (split < 0) return null;
    items.splice(items.length - 1, 1, lastItem.slice(0, split), lastItem.slice(split));
  }

  const counted = items.filter((item) => item.some((t) => t.isWord));
  if (counted.length !== items.length || counted.length < min) return null;
  const firstToken = counted[0][0];
  const lastTokens = counted[counted.length - 1];
  return {
    notation: "series",
    items: counted.length,
    start: firstToken.start,
    end: lastTokens[lastTokens.length - 1].end,
  };
}

function justification(found: Detected): string {
  const opening =
    found.notation === "markers"
      ? `A series of ${found.items} items is marked with ${SCHEME_EXAMPLE[found.scheme ?? "number"]} inside running text.`
      : found.notation === "ordinals"
        ? `A series of ${found.items} steps is announced with ordinal words (“first… second… third…”) inside running text.`
        : `A colon introduces ${found.items} items separated by commas inside one sentence.`;
  return (
    `${opening} The Federal Plain Language Guidelines (2011, pp. 71-72) recommend a vertical list, with a lead-in ` +
    "sentence, for a series of requirements, steps or conditions (ISO 24495-1, 5.2.3). Turning it into a list " +
    "changes the structure of the text; Lucid does not convert it."
  );
}

export const proseEnumerationPass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    const { enabled, minItems } = ctx.config.proseEnumeration;
    if (!enabled) return [];
    const findings: PassFinding[] = [];

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "paragraph") continue;

      const whole = markersIn(block, minItems) ?? ordinalsIn(block, minItems);
      const detected = whole !== null ? [whole] : block.sentences.flatMap((s) => seriesIn(s, minItems) ?? []);

      for (const found of detected) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          span: { start: found.start, end: found.end, text: ctx.doc.source.slice(found.start, found.end) },
          severity: "warning",
          requiresHuman: true,
          justification: justification(found),
          meta: { items: found.items, notation: found.notation, threshold: minItems, thresholdStatus: "provisional" },
        });
      }
    }

    return findings;
  },
};
