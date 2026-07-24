import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "paragraph_length";

export const paragraphLengthPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.paragraphLength.enabled) return [];

    const max = ctx.config.paragraphLength.maxSentences;
    const findings: PassFinding[] = [];

    for (const paragraph of ctx.doc.blocks) {
      if (paragraph.kind !== "paragraph") continue;
      const n = paragraph.sentences.length;
      if (n <= max) continue;
      findings.push({
        criterion: CRITERION,
        category: "structural",
        span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Parágrafo longo — ${n} frases num só bloco pesam a leitura e dificultam localizar a ` +
          "informação. Considere quebrá-lo em parágrafos menores, um por ideia; a ferramenta não divide automaticamente.",
      });
    }

    return findings;
  },
};
