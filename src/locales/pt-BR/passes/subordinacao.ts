import type { Finding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "subordinacao_densa";
const PRINCIPLE = "5.3.4";

export const subordinacaoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["subordinadores.pt"],

  run(ctx) {
    if (!ctx.config.subordinacao.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("subordinadores.pt");
    const threshold = ctx.config.subordinacao.minPorFrase;
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const hits = matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source);
      if (hits.length < threshold) continue;

      const connectives = hits.map((h) => `“${h.text.replace(/\s+/g, " ").trim()}”`).join(", ");
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
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
