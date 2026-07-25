import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "mais_que_perfeito_sintetico";

/**
 * Formas que a morfologia classifica como mais-que-perfeito, mas que no uso real
 * são LEXICALIZADAS e não pedem a troca pela forma composta (A-12c). "Pudera!" é
 * interjeição de concordância/ironia ("Pudera! Ninguém avisou"), não o
 * mais-que-perfeito de "poder" — trocá-la por "tinha podido" destrói a frase.
 * O dataset é derivado do PortiLexicon (morfológico, sem uso), então a exclusão
 * mora aqui, como em `NON_GERUND` (gerundismo) e `participios-falsos-nominais`
 * (passiva). Custo aceito: o mais-que-perfeito genuíno de "poder" — raríssimo no
 * registro-alvo — deixa de ser apontado (precisão > recall, doutrina do projeto).
 */
const LEXICALIZED_EXCLUSIONS = new Set(["pudera"]);

const JUSTIFICATION =
  "Verbo no mais-que-perfeito sintético (ex.: 'fizera' = 'tinha feito') — forma pouco usada na " +
  "fala e de leitura difícil. Considere a forma composta (tinha/havia + particípio); a ferramenta " +
  "não reescreve automaticamente porque a troca depende do contexto.";

export const maisQuePerfeitoPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  dataDeps: ["mais-que-perfeito.pt"],

  run(ctx) {
    if (!ctx.config.maisQuePerfeito.enabled) return [];

    const forms = ctx.data.get<ReadonlySet<string>>("mais-que-perfeito.pt");
    const findings: PassFinding[] = [];

    for (const token of ctx.doc.tokens) {
      if (!token.isWord || !forms.has(token.lower)) continue;
      if (LEXICALIZED_EXCLUSIONS.has(token.lower)) continue;
      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        span: { start: token.start, end: token.end, text: token.text },
        severity: "warning",
        requiresHuman: true,
        justification: JUSTIFICATION,
      });
    }

    return findings;
  },
};
