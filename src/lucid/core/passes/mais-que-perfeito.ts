/**
 * Pass "mais-que-perfeito sintético" — `5.3.3` (frases claras; tempo verbal legível).
 *
 * O mais-que-perfeito SINTÉTICO ("fizera", "requerera", "aprovara") é uma forma verbal pouco
 * usada na fala e de leitura difícil; a forma composta ("tinha/havia feito") é mais clara. É o
 * caso-modelo que JUSTIFICA morfologia: os irregulares ("fizera", "dissera", "coubera", "trouxera")
 * são OPACOS a regex — só um léxico sabe que são pluperfect.
 *
 * MEMBERSHIP num Set derivado do PortiLexicon-UD (`mais-que-perfeito.pt`), já filtrado em
 * build-time para conter só formas INEQUÍVOCAS: qualquer forma que também tenha outra leitura em
 * qualquer classe ("fora"=advérbio, "vira"=verbo virar) foi REMOVIDA na ingestão — a
 * desambiguação é resolvida no build, não em runtime (precisão > recall, sem camada de anotação).
 * Nunca sugere reescrita (trocar para a forma composta exige julgamento) → `requiresHuman`.
 */
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
