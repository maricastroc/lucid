import type { PassFinding, Pass, Token } from "@/lucid/core/types";

const CRITERION = "prose_enumeration";

const ORDINAL_RANK: Record<string, number> = {
  primeiro: 1, primeira: 1,
  segundo: 2, segunda: 2,
  terceiro: 3, terceira: 3,
  quarto: 4, quarta: 4,
  quinto: 5, quinta: 5,
  sexto: 6, sexta: 6,
};

const ROMAN_RANK: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

/** One or two digits only: keeps years and amounts — "(2025)" — from reading as item numbers. */
const RE_SMALL_NUMBER = /^\d{1,2}$/;

/**
 * Rank of an enumeration marker written as a numeral closed by ")" — "(1)", "1)", "(i)".
 * The closing parenthesis is what separates a marker from a number that is simply part of
 * the sentence, and it must be WELDED to the numeral: "item 1 ) do edital" is not a marker.
 * The opening parenthesis is optional because both notations are current in the register.
 */
function markerRankAt(tokens: readonly Token[], index: number): number | null {
  const numeral = tokens[index];
  const closing = tokens[index + 1];
  if (closing?.text !== ")" || closing.start !== numeral.end) return null;

  const opening = tokens[index - 1];
  if (opening?.text === "(" && opening.end !== numeral.start) return null;

  if (RE_SMALL_NUMBER.test(numeral.text)) return Number(numeral.text);
  if (numeral.isWord && numeral.lower in ROMAN_RANK) return ROMAN_RANK[numeral.lower];
  return null;
}

export const proseEnumerationPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.proseEnumeration.enabled) return [];

    const min = ctx.config.proseEnumeration.minMarkers;
    const findings: PassFinding[] = [];

    for (const paragraph of ctx.doc.blocks) {
      if (paragraph.kind !== "paragraph") continue;

      const ranks = new Set<number>();
      let markers = 0;
      let words = 0;

      for (const sentence of paragraph.sentences) {
        for (let i = 0; i < sentence.tokens.length; i++) {
          const token = sentence.tokens[i];

          if (token.isWord && token.lower in ORDINAL_RANK) {
            ranks.add(ORDINAL_RANK[token.lower]);
            words++;
            continue;
          }

          const rank = markerRankAt(sentence.tokens, i);
          if (rank !== null) {
            ranks.add(rank);
            markers++;
          }
        }
      }

      // Anchored at the first item: a run that starts at "(2)" is a reference, not a list.
      if (!ranks.has(1) || ranks.size < min) continue;

      const notation = markers > 0 && words > 0 ? "mista" : markers > 0 ? "marcador" : "ordinal";
      const examples = notation === "ordinal" ? "“primeiro… segundo… terceiro…”" : "“(1)… (2)… (3)…”";

      findings.push({
        criterion: CRITERION,
        category: "structural",
        span: { start: paragraph.start, end: paragraph.end, text: paragraph.text },
        severity: "warning",
        requiresHuman: true,
        justification:
          `Enumeração em prosa — ${ranks.size} itens (${examples}) embutidos ` +
          "no texto corrido. Uma lista deixaria os itens mais fáceis de localizar e comparar; a ferramenta não converte automaticamente.",
        meta: { items: ranks.size, notation },
      });
    }

    return findings;
  },
};
