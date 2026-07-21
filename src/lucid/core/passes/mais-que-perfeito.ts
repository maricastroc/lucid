import type { Finding, Pass } from "../types";

const CRITERION = "mais_que_perfeito_sintetico";
const PRINCIPLE = "5.3.3";

const JUSTIFICATION =
  "Verbo no mais-que-perfeito sintético (ex.: 'fizera' = 'tinha feito') — forma pouco usada na " +
  "fala e de leitura difícil. Considere a forma composta (tinha/havia + particípio); a ferramenta " +
  "não reescreve automaticamente porque a troca depende do contexto.";

export const maisQuePerfeitoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["mais-que-perfeito.pt"],

  run(ctx) {
    if (!ctx.config.maisQuePerfeito.enabled) return [];

    const forms = ctx.data.get("mais-que-perfeito.pt");
    const findings: Finding[] = [];

    for (const token of ctx.doc.tokens) {
      if (!token.isWord || !forms.has(token.lower)) continue;
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
        span: { start: token.start, end: token.end, text: token.text },
        severity: "warning",
        requiresHuman: true,
        justification: JUSTIFICATION,
      });
    }

    return findings;
  },
};
