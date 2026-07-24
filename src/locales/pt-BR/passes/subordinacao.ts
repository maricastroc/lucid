import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "subordinacao_densa";

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
      const hits = matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source);
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
