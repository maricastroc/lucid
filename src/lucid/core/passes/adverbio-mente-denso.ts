import type { Finding, Pass } from "../types";

const CRITERION = "adverbio_mente_denso";
const PRINCIPLE = "5.3.4";

export const adverbioMenteDensoPass: Pass = {
  criterion: CRITERION,
  category: "lexical",
  principle: PRINCIPLE,
  dataDeps: ["adverbios-mente.pt"],

  run(ctx) {
    if (!ctx.config.adverbioMente.enabled) return [];

    const adverbs = ctx.data.get("adverbios-mente.pt");
    const threshold = ctx.config.adverbioMente.minPorFrase;
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const hits = sentence.tokens.filter((t) => t.isWord && adverbs.has(t.lower));
      if (hits.length < threshold) continue;

      for (const token of hits) {
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          principle: PRINCIPLE,
          span: { start: token.start, end: token.end, text: token.text },
          severity: "info",
          requiresHuman: true,
          justification:
            `Concentração de advérbios em -mente (${hits.length} nesta frase) — o excesso pesa a ` +
            "leitura. Considere cortar ou substituir alguns; a ferramenta não decide quais.",
        });
      }
    }

    return findings;
  },
};
