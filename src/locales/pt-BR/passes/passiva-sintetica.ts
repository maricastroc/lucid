import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "passiva_sintetica";

const RE_ENCLITIC_SE = /^\p{L}{2,}-se$/u;

export const passivaSinteticaPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["verbos-pronominais.pt"],

  run(ctx) {
    if (!ctx.config.passivaSintetica.enabled) return [];

    const pronominais = ctx.data.get<ReadonlySet<string>>("verbos-pronominais.pt");
    const findings: PassFinding[] = [];

    for (const token of ctx.doc.tokens) {
      if (!token.isWord) continue;
      if (!RE_ENCLITIC_SE.test(token.lower)) continue;
      if (pronominais.has(token.lower)) continue;

      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        span: { start: token.start, end: token.end, text: token.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `“${token.text}” usa o “se” enclítico, que costuma esconder quem pratica a ação (passiva sintética ou ` +
          "indeterminação do sujeito: “aplica-se a multa” não diz quem aplica). Pode também ser reflexivo — a " +
          "ferramenta NÃO desfaz essa ambiguidade nem reescreve: aponta e devolve a decisão a você.",
        meta: { encliticForm: token.lower },
      });
    }

    return findings;
  },
};
