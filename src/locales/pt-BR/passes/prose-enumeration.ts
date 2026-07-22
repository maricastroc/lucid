/**
 * Pass "enumeração em prosa" — `5.2` (Localizável).
 *
 * Uma sequência de itens embutida no meio do texto corrido ("primeiro… segundo… terceiro…") é
 * mais difícil de localizar e comparar do que uma lista. Sinal ESTRUTURAL sobre a camada de
 * parágrafos: marca o parágrafo que concentra ≥ `minMarkers` ordinais DISTINTOS, começando por
 * "primeiro" (a âncora que separa uma enumeração real de um "segundo o artigo" solto).
 *
 * Conjunto FECHADO de ordinais (inline, sem léxico) — precisão > recall: exigir "primeiro" +
 * ≥3 ranks distintos evita falso positivo com "segundo" (preposição) isolado. Não converte em
 * lista sozinho (→ `requiresHuman`). Enumeradores numéricos ("1) 2) 3)") ficam adiados.
 */
import type { Finding, Pass } from "@/lucid/core/types";

const CRITERION = "prose_enumeration";
const PRINCIPLE = "5.2";

/** Forma → posição na sequência (1..6). Masculino e feminino contam para o mesmo rank. */
const ORDINAL_RANK: Record<string, number> = {
  primeiro: 1, primeira: 1,
  segundo: 2, segunda: 2,
  terceiro: 3, terceira: 3,
  quarto: 4, quarta: 4,
  quinto: 5, quinta: 5,
  sexto: 6, sexta: 6,
};

export const proseEnumerationPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.proseEnumeration.enabled) return [];

    const min = ctx.config.proseEnumeration.minMarkers;
    const findings: Finding[] = [];

    for (const paragraph of ctx.doc.blocks) {
      if (paragraph.kind !== "paragraph") continue;
      const ranks = new Set<number>();
      for (const sentence of paragraph.sentences) {
        for (const token of sentence.tokens) {
          if (token.isWord && token.lower in ORDINAL_RANK) ranks.add(ORDINAL_RANK[token.lower]);
        }
      }

      if (!ranks.has(1) || ranks.size < min) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        principle: PRINCIPLE,
        span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Enumeração em prosa — ${ranks.size} itens ordinais (“primeiro… segundo… terceiro…”) embutidos ` +
          "no texto corrido. Uma lista deixaria os itens mais fáceis de localizar e comparar; a ferramenta não converte automaticamente.",
      });
    }

    return findings;
  },
};
