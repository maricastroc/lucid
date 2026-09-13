import type { Pass, PassFinding, Token } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import type { AcronymLexiconEn } from "../datasets/registry";

const CRITERION = "undefined_acronym";

const RE_ACRONYM = /^\p{Lu}{2,6}$/u;
const RE_PLURAL_ACRONYM = /^(\p{Lu}{2,6})s$/u;
const RE_ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const RE_ALL_CAPS_WORD = /^\p{Lu}{2,}$/u;
const RE_DIGIT_START = /^\p{Nd}/u;

export function acronymKey(text: string): string | null {
  if (RE_ACRONYM.test(text)) return text;
  const plural = RE_PLURAL_ACRONYM.exec(text);
  return plural === null ? null : plural[1];
}

function lowercaseForms(tokens: readonly Token[]): ReadonlySet<string> {
  const forms = new Set<string>();
  for (const token of tokens) if (token.isWord && token.text !== token.text.toUpperCase()) forms.add(token.lower);
  return forms;
}

function weldedToDigits(tokens: readonly Token[], index: number): boolean {
  const token = tokens[index];
  const next = tokens[index + 1];
  if (next !== undefined && next.start === token.end) {
    if (RE_DIGIT_START.test(next.text)) return true;
    const after = tokens[index + 2];
    if (next.text === "-" && after !== undefined && RE_DIGIT_START.test(after.text)) return true;
  }
  const prev = tokens[index - 1];
  return prev !== undefined && prev.end === token.start && RE_DIGIT_START.test(prev.text);
}

function inCapitalRun(tokens: readonly Token[], index: number): boolean {
  const neighbour = (offset: number): boolean => {
    const token = tokens[index + offset];
    return token !== undefined && token.isWord && RE_ALL_CAPS_WORD.test(token.text);
  };
  return neighbour(-1) || neighbour(1);
}

export const undefinedAcronymPass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["acronyms.en"],

  run(ctx) {
    const lex = ctx.data.get<AcronymLexiconEn>("acronyms.en");
    const tokens = ctx.doc.tokens;
    const lowercase = lowercaseForms(tokens);
    const settled = new Set<string>();
    const findings: PassFinding[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.isWord) continue;
      const key = acronymKey(token.text);
      if (key === null || settled.has(key)) continue;
      if (lex.known.has(key) || RE_ROMAN.test(key) || lowercase.has(key.toLowerCase())) continue;
      if (weldedToDigits(tokens, i) || inCapitalRun(tokens, i)) continue;

      settled.add(key);
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      const definedHere = (prev?.text === "(" && next?.text === ")") || next?.text === "(";
      if (definedHere) continue;

      findings.push({
        criterion: CRITERION,
        category: "lexical",
        span: { start: token.start, end: token.end, text: token.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `“${key}” is used before it is spelled out. The Federal Plain Language Guidelines (2011, p. 34) ask to ` +
          "define an abbreviation the first time it is used — or to replace it with a short name that says what it " +
          "is (ISO 24495-1, 5.3.2). Lucid does not know what the acronym stands for; writing it out is the author's.",
        meta: { acronym: key },
      });
    }

    return findings;
  },
};
