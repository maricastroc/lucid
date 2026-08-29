import type { PassFinding, Pass, Token } from "@/lucid/core/types";
import { getPrepared } from "../datasets/registry";

const CRITERION = "leitor_terceira_pessoa";

const READER_NOUNS = getPrepared("substantivos-leitor.pt");

const SUBJECT_DETERMINERS = new Set([
  "o",
  "a",
  "os",
  "as",
  "todo",
  "toda",
  "todos",
  "todas",
  "cada",
  "qualquer",
  "nenhum",
  "nenhuma",
]);

const DEONTIC_VERBS = new Set([
  "deve",
  "devem",
  "deverá",
  "deverão",
  "deveria",
  "deveriam",
  "precisa",
  "precisam",
  "precisará",
  "precisarão",
  "poderá",
  "poderão",
  "pode",
  "podem",
]);

const COPULA_OBLIGATION = new Set(["é", "são", "está", "estão", "fica", "ficam", "será", "serão"]);
const OBRIGADO_FORMS = new Set(["obrigado", "obrigada", "obrigados", "obrigadas"]);
const TER_FORMS = new Set(["tem", "têm"]);

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

function deonticEndAt(tokens: readonly Token[], i: number): number | null {
  const token = tokens[i];
  if (!token.isWord) return null;

  if (DEONTIC_VERBS.has(token.lower)) return i;

  if (COPULA_OBLIGATION.has(token.lower)) {
    const part = tokens[i + 1];
    const prep = tokens[i + 2];
    if (part?.isWord && OBRIGADO_FORMS.has(part.lower) && prep?.isWord && prep.lower === "a") return i + 2;
  }

  if (TER_FORMS.has(token.lower)) {
    const next = tokens[i + 1];
    if (next?.isWord && (next.lower === "de" || next.lower === "que")) return i + 1;
  }

  return null;
}

function findDeonticAfter(tokens: readonly Token[], startIndex: number): { start: number; end: number } | null {
  let consumed = 0;
  for (let i = startIndex; i < tokens.length && consumed < MAX_WINDOW_TOKENS; i++) {
    const token = tokens[i];
    if (token.isWord) {
      const end = deonticEndAt(tokens, i);
      if (end !== null) return { start: i, end };
      consumed++;
      continue;
    }
    if (isBarrier(token)) return null;
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
        const determinerBefore = prev?.isWord && SUBJECT_DETERMINERS.has(prev.lower) ? prev : null;
        const isSubject = determinerBefore !== null || i === firstWord;
        if (!isSubject) continue;

        const deontic = findDeonticAfter(tokens, i + 1);
        if (deontic === null) continue;

        const start = (determinerBefore ?? noun).start;
        const end = tokens[deontic.end].end;
        const deonticText = ctx.doc.source.slice(tokens[deontic.start].start, tokens[deontic.end].end);

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
          meta: { readerNoun: noun.text, deonticVerb: deonticText },
        });
      }
    }

    return findings;
  },
};
