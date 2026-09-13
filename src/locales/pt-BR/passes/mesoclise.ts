import type { PassFinding, Pass } from "@/lucid/core/types";
import type { PtConfig } from "../config";

const CRITERION = "mesoclise";

const RE_MESOCLISE =
  /^\p{L}+-(?:me|te|se|o|a|os|as|lhe|lhes|nos|vos|lo|la|los|las)-(?:á|ás|ão|ei|emos|eis|ia|ias|íamos|íeis|iam)$/u;

export const mesoclisePass: Pass<PtConfig> = {
  criterion: CRITERION,
  category: "syntactic",

  run(ctx) {
    if (!ctx.config.mesoclise.enabled) return [];

    const findings: PassFinding[] = [];
    for (const token of ctx.doc.tokens) {
      if (!token.isWord || !RE_MESOCLISE.test(token.lower)) continue;
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        span: { start: token.start, end: token.end, text: token.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Mesóclise (“${token.text}”) — o pronome encaixado no meio do verbo é uma forma arcaica e ` +
          "de leitura difícil. Prefira a forma comum (ex.: “vai fazer-se” em vez de “far-se-á”); a ferramenta não reescreve automaticamente.",
      });
    }
    return findings;
  },
};
