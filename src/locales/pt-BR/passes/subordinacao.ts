import type { PassFinding, Pass, Sentence } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence, type PhraseHit } from "./phrase-match";

const CRITERION = "subordinacao_densa";

const COMPARATIVE_HEADS = new Set([
  "mais",
  "menos",
  "maior",
  "maiores",
  "menor",
  "menores",
  "melhor",
  "melhores",
  "pior",
  "piores",
  "tanto",
  "tanta",
  "tantos",
  "tantas",
  "tão",
  "antes",
  "depois",
]);

const COMPARATIVE_LOOKBACK = 4;

const CLEFT_HEADS = new Set(["é", "foi", "são", "eram", "era", "será", "serão", "seja"]);

function countsAsSubordinator(hit: PhraseHit, sentence: Sentence): boolean {
  if (hit.text.toLowerCase() !== "que") return true;

  const index = sentence.tokens.findIndex((t) => t.start === hit.start);
  if (index <= 0) return true;

  const before = sentence.tokens[index - 1];
  if (before.isWord && CLEFT_HEADS.has(before.lower)) return false;

  let seen = 0;
  for (let i = index - 1; i >= 0 && seen < COMPARATIVE_LOOKBACK; i--) {
    const token = sentence.tokens[i];
    if (!token.isWord) return true;
    if (COMPARATIVE_HEADS.has(token.lower)) return false;
    seen++;
  }
  return true;
}

export const subordinacaoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["subordinadores.pt"],

  run(ctx) {
    if (!ctx.config.subordinacao.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("subordinadores.pt");
    const threshold = ctx.config.subordinacao.minPorFrase;
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const hits = matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source).filter((hit) =>
        countsAsSubordinator(hit, sentence),
      );
      if (hits.length < threshold) continue;

      const connectives = hits.map((h) => `“${h.text.replace(/\s+/g, " ").trim()}”`).join(", ");
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        span: { start: sentence.start, end: sentence.end, text: sentence.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Esta frase encadeia ${hits.length} orações subordinadas (${connectives}) — muitas ideias ` +
          "presas numa frase só pesam a leitura. Considere separar em frases mais curtas, uma ideia por " +
          "vez; a ferramenta não decide onde quebrar.",
        meta: { clauses: hits.length, threshold },
      });
    }

    return findings;
  },
};
