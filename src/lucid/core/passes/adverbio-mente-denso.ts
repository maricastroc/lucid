/**
 * Pass "advérbios em -mente densos" — `5.3.4` (frases concisas).
 *
 * O empilhamento de advérbios em -mente ("efetivamente", "rigorosamente", "sistematicamente")
 * pesa a leitura. Sinal de DENSIDADE: só marca quando uma frase concentra ≥ `minPorFrase`
 * advérbios em -mente — um advérbio isolado é legítimo, o excesso é que atrapalha.
 *
 * MEMBERSHIP num allowlist derivado do PortiLexicon-UD (`adverbios-mente.pt`), para não marcar
 * palavras que terminam em -mente mas não são advérbio ("semente", "mente"). Nunca decide QUAIS
 * cortar (→ `requiresHuman`).
 */
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
