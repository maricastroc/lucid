import type { PassFinding, Pass } from "@/lucid/core/types";

const CRITERION = "long_heading";

function endsAsStatement(text: string): boolean {
  const t = text.trimEnd();
  if (t.endsWith("…") || t.endsWith("...")) return false;
  return t.endsWith(".");
}

export const longHeadingPass: Pass = {
  criterion: CRITERION,
  category: "structural",

  run(ctx) {
    if (!ctx.config.longHeading.enabled) return [];

    const max = ctx.config.longHeading.maxWords;
    const findings: PassFinding[] = [];

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "heading") continue;
      const span = { start: block.start, end: block.end, text: block.text };

      if (block.wordCount > max) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          span,
          severity: "warning",
          requiresHuman: true,
          justification:
            `Título com ${block.wordCount} palavras (acima de ${max}). Um título é um rótulo para varrer e ` +
            "localizar a seção; quando fica longo, o leitor precisa lê-lo inteiro em vez de usá-lo como referência. " +
            "Encurtar exige decidir o que é essencial — a ferramenta não reescreve títulos.",
          meta: { reason: "length", words: block.wordCount, threshold: max },
        });
        continue;
      }

      const multi = block.sentences.length >= 2;
      if (multi || endsAsStatement(block.text)) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          span,
          severity: "warning",
          requiresHuman: true,
          justification: multi
            ? `Título formado por ${block.sentences.length} frases — um título é um rótulo, não um texto corrido. ` +
              "Reduza a uma etiqueta curta que o leitor use para localizar a seção; a ferramenta não faz esse corte."
            : "Título termina com ponto final, como uma frase — títulos são rótulos e não fecham como oração. " +
              "Rever a forma é decisão de autor; a ferramenta não reescreve títulos.",
          meta: { reason: "sentence", words: block.wordCount, sentences: block.sentences.length },
        });
      }
    }

    return findings;
  },
};
