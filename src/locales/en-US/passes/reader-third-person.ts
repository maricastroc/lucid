import type { Pass, PassFinding, Token } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import type { ReaderLexiconEn } from "../datasets/registry";

const CRITERION = "reader_in_third_person";
const MAX_WINDOW = 4;
const RELATIVE_EXTRA = 6;
const MODIFIERS_WITH_DETERMINER = 3;
const MODIFIERS_WITHOUT_DETERMINER = 1;
const BOUNDARY_PUNCTUATION = new Set([",", ";", ":", "(", "—", "–", "-"]);

function subjectStart(tokens: readonly Token[], nounIndex: number, lex: ReaderLexiconEn): number | null {
  let start = nounIndex;
  let modifiers = 0;
  for (let j = nounIndex - 1; j >= 0; j--) {
    const token = tokens[j];
    if (!token.isWord) return BOUNDARY_PUNCTUATION.has(token.text) ? start : null;
    const lower = token.lower;
    if (lex.determiners.has(lower)) {
      const before = j - 1 >= 0 ? tokens[j - 1] : null;
      if (modifiers > MODIFIERS_WITH_DETERMINER) return null;
      if (before === null) return j;
      if (!before.isWord) return BOUNDARY_PUNCTUATION.has(before.text) ? j : null;
      return lex.clauseOpeners.has(before.lower) ? j : null;
    }
    if (lex.clauseOpeners.has(lower)) return modifiers <= MODIFIERS_WITHOUT_DETERMINER ? start : null;
    if (lex.prepositions.has(lower) || lex.stops.has(lower)) return null;
    modifiers += 1;
    if (modifiers > MODIFIERS_WITH_DETERMINER) return null;
    start = j;
  }
  return modifiers <= MODIFIERS_WITHOUT_DETERMINER ? start : null;
}

function deonticAt(tokens: readonly Token[], index: number, lex: ReaderLexiconEn): number | null {
  if (lex.deontic.has(tokens[index].lower)) return index;
  for (const phrase of lex.deonticPhrases) {
    let k = 0;
    while (
      k < phrase.length &&
      index + k < tokens.length &&
      tokens[index + k].isWord &&
      tokens[index + k].lower === phrase[k]
    ) {
      k += 1;
    }
    if (k === phrase.length) return index + k - 1;
  }
  return null;
}

function skipCoordinatedReader(tokens: readonly Token[], index: number, lex: ReaderLexiconEn): number | null {
  const lower = tokens[index].lower;
  if (lower !== "and" && lower !== "or") return null;
  let next = index + 1;
  if (next < tokens.length && tokens[next].isWord && lex.determiners.has(tokens[next].lower)) next += 1;
  if (next < tokens.length && tokens[next].isWord && lex.readerNouns.has(tokens[next].lower)) return next;
  return null;
}

interface Deontic {
  readonly start: number;
  readonly end: number;
}

function deonticAfter(tokens: readonly Token[], nounIndex: number, lex: ReaderLexiconEn): Deontic | null {
  let limit = MAX_WINDOW;
  let words = 0;
  let relative = false;
  for (let i = nounIndex + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.isWord && !/^\p{Nd}/u.test(token.text)) return null;
    const end = token.isWord ? deonticAt(tokens, i, lex) : null;
    if (end !== null) return { start: i, end };
    const lower = token.lower;
    if (lex.stops.has(lower) || lex.barrierConjunctions.has(lower)) return null;
    const coordinated = skipCoordinatedReader(tokens, i, lex);
    if (coordinated !== null) {
      i = coordinated;
      continue;
    }
    if (!relative && lex.relativePronouns.has(lower)) {
      relative = true;
      limit += RELATIVE_EXTRA;
    }
    words += 1;
    if (words > limit) return null;
  }
  return null;
}

export const readerThirdPersonPass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["reader-third-person.en"],

  run(ctx) {
    const lex = ctx.data.get<ReaderLexiconEn>("reader-third-person.en");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        const noun = tokens[i];
        if (!noun.isWord || !lex.readerNouns.has(noun.lower)) continue;
        const startIndex = subjectStart(tokens, i, lex);
        if (startIndex === null) continue;
        const deontic = deonticAfter(tokens, i, lex);
        if (deontic === null) continue;

        const start = tokens[startIndex].start;
        const end = tokens[deontic.end].end;
        const marker = ctx.doc.source.slice(tokens[deontic.start].start, end);

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "info",
          requiresHuman: true,
          justification:
            `The reader is named in the third person (“${noun.text}”) and given an obligation or a permission ` +
            `(“${marker}”). The Federal Plain Language Guidelines (2011, p. 30) recommend speaking to the reader as ` +
            "“you”, which says plainly who must act (ISO 24495-1, 5.3.3). Only the author knows whether the " +
            "document's reader is the person named here.",
          meta: { readerNoun: noun.text, deontic: marker },
        });
        i = deontic.end;
      }
    }

    return findings;
  },
};
