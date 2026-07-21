/**
 * Pass "mesóclise" — `5.3.3` (frases claras; forma verbal legível).
 *
 * Mesóclise ("far-se-á", "dir-lhe-ia", "recolher-se-ão"): o pronome no MEIO do verbo, entre o
 * radical e a terminação de futuro/condicional. Construção arcaica e de leitura difícil — a forma
 * comum ("vai fazer-se", "diria a ele") é mais clara. Distintamente PT, típica do juridiquês.
 *
 * REGEX pura sobre tokens-palavra (o tokenizador já junta "far-se-á" num token só). Zero léxico,
 * zero FP: exige clítico no meio + terminação de futuro/condicional — o que exclui nomes com a
 * mesma forma ("bem-te-vi", que termina em "vi", não em terminação verbal). Nunca reescreve
 * (reordenar o clítico depende do contexto → `requiresHuman`).
 */
import type { Finding, Pass } from "../types";

const CRITERION = "mesoclise";
const PRINCIPLE = "5.3.3";

/** radical - clítico - terminação de futuro/condicional. */
const RE_MESOCLISE =
  /^\p{L}+-(?:me|te|se|o|a|os|as|lhe|lhes|nos|vos|lo|la|los|las)-(?:á|ás|ão|ei|emos|eis|ia|ias|íamos|íeis|iam)$/u;

export const mesoclisePass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.mesoclise.enabled) return [];

    const findings: Finding[] = [];
    for (const token of ctx.doc.tokens) {
      if (!token.isWord || !RE_MESOCLISE.test(token.lower)) continue;
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
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
