import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "adverbios_vagos";

/**
 * Advérbios vagos (ADR-058): advérbios de reforço/atenuação que, removidos, não
 * mudam a proposição — só o "volume". Disparo POR PRESENÇA (não densidade), sobre
 * um léxico curado que exclui advérbios de modo com conteúdo. Substitui, como
 * critério conceitualmente mais preciso, o descontinuado `adverbio_mente_denso`.
 */
export const adverbiosVagosPass: Pass = {
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
            `Advérbio vago (“${token.lower}”) — reforço/atenuação que costuma sair sem mudar o que a ` +
            "frase afirma, só o volume. Avalie cortar; a ferramenta aponta, não decide por você.",
        });
      }
    }

    return findings;
  },
};
