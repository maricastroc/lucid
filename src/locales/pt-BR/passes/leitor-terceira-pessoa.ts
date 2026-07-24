import type { PassFinding, Pass, Token } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "leitor_terceira_pessoa";

const READER_NOUNS = getPrepared("substantivos-leitor.pt");

const DEFINITE_ARTICLES = new Set(["o", "a", "os", "as"]);

const DEONTIC_VERBS = new Set([
  "deve", "devem", "deverá", "deverão", "deveria", "deveriam",
  "precisa", "precisam", "precisará", "precisarão",
  "poderá", "poderão", "pode", "podem",
]);

const BARRIER_PUNCTUATION = new Set([",", ";", ":", "!", "?", "…", "(", ")", "[", "]", '"', "'", "—", "–", "/"]);

const BARRIER_CONJUNCTIONS = new Set(["que", "e", "ou", "mas", "porque", "pois", "quando", "se", "como", "porém"]);

const MAX_WINDOW_TOKENS = 4;

function isBarrier(token: Token): boolean {
  if (token.isWord) return BARRIER_CONJUNCTIONS.has(token.lower);
  return BARRIER_PUNCTUATION.has(token.text);
}

function firstWordIndex(tokens: readonly Token[]): number {
  for (let i = 0; i < tokens.length; i++) if (tokens[i].isWord) return i;
  return -1;
}

function findDeonticAfter(tokens: readonly Token[], startIndex: number): number | null {
  let consumed = 0;
  for (let i = startIndex; i < tokens.length && consumed < MAX_WINDOW_TOKENS; i++) {
    const token = tokens[i];
    if (token.isWord && DEONTIC_VERBS.has(token.lower)) return i;
    if (isBarrier(token)) return null;
    if (token.isWord) {
      consumed++;
      continue;
    }
    return null;
  }
  return null;
}

export const leitorTerceiraPessoaPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["substantivos-leitor.pt"],

  run(ctx) {
    if (!ctx.config.leitorTerceiraPessoa.enabled) return [];

    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;
      const firstWord = firstWordIndex(tokens);

      for (let i = 0; i < tokens.length; i++) {
        const noun = tokens[i];
        if (!(noun.isWord && READER_NOUNS.has(noun.lower))) continue;

        const prev = tokens[i - 1];
        const articleBefore = prev?.isWord && DEFINITE_ARTICLES.has(prev.lower) ? prev : null;
        const isSubject = articleBefore !== null || i === firstWord;
        if (!isSubject) continue;

        const deonticIndex = findDeonticAfter(tokens, i + 1);
        if (deonticIndex === null) continue;

        const start = (articleBefore ?? noun).start;
        const end = tokens[deonticIndex].end;

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "info",
          requiresHuman: true,
          justification:
            `O texto se refere ao leitor em terceira pessoa (“${noun.text}”) e lhe atribui uma obrigação. ` +
            "Falar diretamente com o leitor (“você deve…”) ou usar o imperativo aproxima e deixa claro quem " +
            "age. A ferramenta não reescreve: mudar a pessoa do texto é decisão de estilo sua.",
          meta: { readerNoun: noun.text, deonticVerb: tokens[deonticIndex].text },
        });
      }
    }

    return findings;
  },
};
