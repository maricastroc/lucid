import type { Finding, Pass } from "../types";
import { matchPhrasesInSentence } from "./phrase-match";

const CRITERION = "dupla_negacao";
const PRINCIPLE = "5.3.3";

export const duplaNegacaoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: ["duplas-negacoes.pt"],

  run(ctx) {
    if (!ctx.config.duplaNegacao.enabled) return [];

    const byFirstWord = ctx.data.get("duplas-negacoes.pt");
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const direta = hit.entry.plain ? ` Diga direto: “${hit.entry.plain}”.` : "";
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start: hit.start, end: hit.end, text: hit.text },
          severity: "warning",
          requiresHuman: true,
          justification:
            `Dupla negação — “${hit.text}” afirma negando o negativo, e o leitor tem de desfazer a ` +
            `negação para entender.${direta} A ferramenta não reescreve automaticamente porque o encaixe depende do contexto.`,
        });
      }
    }

    return findings;
  },
};
