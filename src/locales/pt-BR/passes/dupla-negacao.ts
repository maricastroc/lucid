import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PhrasePrepared } from "../datasets/types";
import { matchPhrasesInSentence } from "../../_shared";
import type { PtConfig } from "../config";

const CRITERION = "dupla_negacao";

export const duplaNegacaoPass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["duplas-negacoes.pt"],

  run(ctx) {
    if (!ctx.config.duplaNegacao.enabled) return [];

    const byFirstWord = ctx.data.get<PhrasePrepared>("duplas-negacoes.pt");
    const findings: PassFinding[] = [];

    for (const sentence of ctx.doc.sentences) {
      for (const hit of matchPhrasesInSentence(sentence, byFirstWord, ctx.doc.source)) {
        const next = hit.entry.plain
          ? ` Forma direta registrada: “${hit.entry.plain}”. Confira se ela mantém a nuance que você quer dar.`
          : hit.entry.withheldBecause
            ? ` O Lucid não registra forma direta para ela. ${hit.entry.withheldBecause}`
            : " Diga de forma direta o que a expressão afirma, na intensidade que você quer dar.";
        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          span: { start: hit.start, end: hit.end, text: hit.text },
          severity: "warning",
          requiresHuman: true,
          justification:
            `Dupla negação: “${hit.text}” afirma negando o contrário, e o leitor precisa desfazer as ` +
            `negações para entender.${next}`,
        });
      }
    }

    return findings;
  },
};
