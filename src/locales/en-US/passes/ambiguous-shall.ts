import type { Pass, PassFinding } from "@/lucid/core/types";
import type { EnConfig } from "../config";
import type { ShallLexiconEn } from "../datasets/registry";

const CRITERION = "ambiguous_shall";

const AFFIRMATIVE =
  "“shall” can state an obligation, a discretion, a recommendation or a prediction, and the sentence does not say " +
  "which. The Federal Plain Language Guidelines (2011, p. 25) recommend “must” for an obligation, “may” for a " +
  "discretionary action and “should” for a recommendation; “will” for a prediction is Lucid's note. Lucid does " +
  "not pick the reading and does not replace the word: only the author knows what is meant.";

const NEGATED =
  "“shall not” can state a prohibition or a prediction, and the sentence does not say which. The Federal Plain " +
  "Language Guidelines (2011, p. 25) recommend “must not” for a prohibition; “will not” for a prediction is " +
  "Lucid's note. Lucid does not pick the reading and does not replace the words: only the author knows what is meant.";

export const ambiguousShallPass: Pass<EnConfig> = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["shall.en"],

  run(ctx) {
    const lex = ctx.data.get<ShallLexiconEn>("shall.en");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token.isWord || !lex.forms.has(token.lower)) continue;

        const next = i + 1 < tokens.length && tokens[i + 1].isWord ? tokens[i + 1] : null;
        const negator = next !== null && lex.negators.has(next.lower) ? next : null;
        const negated = negator !== null || /n['’]t$/.test(token.lower);
        const start = token.start;
        const end = (negator ?? token).end;

        findings.push({
          criterion: CRITERION,
          category: "lexical",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: true,
          justification: negated ? NEGATED : AFFIRMATIVE,
          meta: { negated },
        });
        if (negator !== null) i += 1;
      }
    }

    return findings;
  },
};
