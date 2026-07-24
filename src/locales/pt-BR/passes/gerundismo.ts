import type { PassFinding, Pass, Token } from "@/lucid/core/types";

const CRITERION = "gerundismo";

const IR_FORMS = new Set(["vou", "vais", "vai", "vamos", "ides", "vão", "irei", "irás", "irá", "iremos", "ireis", "irão"]);

const GERUND_SUFFIXES = ["ando", "endo", "indo"];

const NON_GERUND = new Set([
  "lindo", "brando", "tremendo", "horrendo", "estupendo", "nefando", "infando", "reverendo", "venerando", "orando",
]);

function isGerund(token: Token): boolean {
  if (!token.isWord || token.lower.length < 5) return false;
  if (NON_GERUND.has(token.lower)) return false;
  return GERUND_SUFFIXES.some((suffix) => token.lower.endsWith(suffix));
}

export const gerundismoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",

  run(ctx) {
    if (!ctx.config.gerundismo.enabled) return [];

    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const words = sentence.tokens.filter((t) => t.isWord);
      for (let i = 0; i + 2 < words.length; i++) {
        if (!IR_FORMS.has(words[i].lower)) continue;
        if (words[i + 1].lower !== "estar") continue;
        if (!isGerund(words[i + 2])) continue;

        const start = words[i].start;
        const end = words[i + 2].end;
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: true,
          justification:
            "Gerundismo ('vou estar enviando') — perífrase que alonga a frase sem necessidade. " +
            "Prefira a forma simples ('vou enviar' / 'enviarei'); a ferramenta não reescreve automaticamente.",
        });
      }
    }

    return findings;
  },
};
