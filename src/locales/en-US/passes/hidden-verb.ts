import type { Pass, PassFinding, Token } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import type { AttestedHiddenVerb, HiddenVerbLexiconEn, LightVerbForm } from "../datasets/registry";

const CRITERION = "hidden_verb";

function nextWord(tokens: readonly Token[], index: number): number | null {
  const next = index + 1;
  return next < tokens.length && tokens[next].isWord ? next : null;
}

function singular(lower: string, lex: HiddenVerbLexiconEn): string {
  for (const suffix of lex.suffixes) if (lower.endsWith(`${suffix}s`)) return lower.slice(0, -1);
  return lower;
}

export function deverbalSuffix(lower: string, lex: HiddenVerbLexiconEn): string | null {
  const noun = singular(lower, lex);
  if (noun.length < 6 || !/^[a-z]+$/.test(noun) || lex.nonDeverbal.has(noun)) return null;
  return lex.suffixes.find((suffix) => noun.endsWith(suffix)) ?? null;
}

interface Candidate {
  readonly light: LightVerbForm;
  readonly lightIndex: number;
  readonly determiner: string | null;
  readonly modified: boolean;
  readonly nominalIndex: number;
}

function candidateAfter(tokens: readonly Token[], index: number, lex: HiddenVerbLexiconEn): Candidate | null {
  const light = lex.lightForms.get(tokens[index].lower);
  if (light === undefined) return null;

  let cursor = nextWord(tokens, index);
  if (light.particle !== null) {
    if (cursor === null || tokens[cursor].lower !== light.particle) return null;
    cursor = nextWord(tokens, cursor);
  }
  if (cursor === null) return null;

  let determiner: string | null = null;
  if (lex.determiners.has(tokens[cursor].lower)) {
    determiner = tokens[cursor].lower;
    cursor = nextWord(tokens, cursor);
    if (cursor === null) return null;
  }

  const lower = tokens[cursor].lower;
  if (deverbalSuffix(lower, lex) !== null || lex.attestedNominals.has(lower)) {
    return { light, lightIndex: index, determiner, modified: false, nominalIndex: cursor };
  }
  if (lex.determiners.has(lower) || lex.lightForms.has(lower)) return null;

  const after = nextWord(tokens, cursor);
  if (after === null || deverbalSuffix(tokens[after].lower, lex) === null) return null;
  return { light, lightIndex: index, determiner, modified: true, nominalIndex: after };
}

function justification(
  phrase: string,
  lightForm: string,
  suffix: string | null,
  attested: AttestedHiddenVerb | null,
  swap: boolean,
): string {
  if (attested !== null && swap) {
    return (
      `Verb hidden in a noun: “${phrase}” uses a noun where the verb “${attested.verb}” says the action directly ` +
      `(ISO 24495-1, 5.3.3). The equivalence is attested in the ${attested.source}; whether to use it is the ` +
      "author's decision."
    );
  }
  if (attested !== null) {
    return (
      `Verb hidden in a noun: the attested verb is “${attested.verb}” (${attested.source}), but “${lightForm}” ` +
      "carries tense or agreement that a direct swap would lose. Lucid does not inflect verbs; rewriting the " +
      "phrase is yours."
    );
  }
  return (
    `Verb possibly hidden in a noun: the light verb “${lightForm}” is followed by a noun ending in “-${suffix}”, ` +
    "a suffix that usually turns a verb into a noun (ISO 24495-1, 5.3.3). No one-to-one equivalence is attested " +
    "for this phrase, so Lucid does not name a verb. Check whether a single verb says it more directly."
  );
}

export const hiddenVerbPass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["hidden-verb.en"],

  run(ctx) {
    const lex = ctx.data.get<HiddenVerbLexiconEn>("hidden-verb.en");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        if (!tokens[i].isWord) continue;
        const candidate = candidateAfter(tokens, i, lex);
        if (candidate === null) continue;

        const nominalToken = tokens[candidate.nominalIndex];
        const nominal = nominalToken.lower;
        const suffix = deverbalSuffix(nominal, lex);
        const following = nextWord(tokens, candidate.nominalIndex);

        const attestedEntry = lex.attested.get(`${candidate.light.lemma}|${nominal}`) ?? null;
        const attested =
          attestedEntry !== null &&
          !candidate.modified &&
          (candidate.determiner === null || lex.swapDeterminers.has(candidate.determiner))
            ? attestedEntry
            : null;

        const needsPreposition = candidate.light.lemma === "have";
        const productive =
          suffix !== null &&
          (!needsPreposition || (following !== null && lex.havePrepositions.has(tokens[following].lower)));

        if (attested === null && !productive) continue;

        let endIndex = candidate.nominalIndex;
        if (
          attested !== null &&
          attested.consumes !== null &&
          following !== null &&
          tokens[following].lower === attested.consumes
        ) {
          endIndex = following;
        }

        const lightToken = tokens[candidate.lightIndex];
        const swap = attested !== null && candidate.light.base;
        const start = lightToken.start;
        const end = tokens[endIndex].end;
        const phrase = ctx.doc.source.slice(start, end);

        const meta: Record<string, string | number | boolean> = {
          productive,
          curated: attested !== null,
          lightVerb: candidate.light.lemma,
          lightForm: lightToken.lower,
          nominal,
          swap,
        };
        if (suffix !== null) meta.suffix = suffix;
        if (attested !== null) {
          meta.verb = attested.verb;
          meta.attestedIn = attested.source;
        }

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: phrase },
          severity: "warning",
          suggestion: swap && attested !== null ? attested.verb : undefined,
          requiresHuman: !swap,
          justification: justification(phrase, lightToken.lower, suffix, attested, swap),
          meta,
        });
        i = endIndex;
      }
    }

    return findings;
  },
};
