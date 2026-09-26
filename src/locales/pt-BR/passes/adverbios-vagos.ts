import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PtConfig } from "../config";

const CRITERION = "adverbios_vagos";

export const adverbiosVagosPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "lexical",
  dataDeps: ["adverbios-vagos.pt"],

  run(ctx) {
    if (!ctx.config.adverbiosVagos.enabled) return [];

    const vagos = ctx.data.get<ReadonlySet<string>>("adverbios-vagos.pt");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const token of sentence.tokens) {
        if (!token.isWord || !vagos.has(token.lower)) continue;
        findings.push({
          criterion: CRITERION,
          category: "lexical",
          span: { start: token.start, end: token.end, text: token.text },
          severity: "info",
          requiresHuman: true,
          justification:
            `Advérbio vago: “${token.lower}” reforça ou atenua sem acrescentar informação. ` +
            "Releia a frase sem ele; se o que ela afirma continuar igual, corte.",
        });
      }
    }

    return findings;
  },
};
