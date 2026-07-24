import type { Block, PassFinding, Pass, Sentence } from "@/lucid/core/types";
import { normalizeNumber } from "../services/normalize-number";

const CRITERION = "heading_body_mismatch";

function sentencesOf(block: Block): readonly Sentence[] {
  return block.kind === "list" ? block.items.flatMap((item) => item.sentences) : block.sentences;
}

/**
 * Palavras de conteúdo, com plural normalizado para singular (ADR-056/Etapa 1),
 * para que "documentos" no título ecoe "documento" no corpo. A filtragem de
 * stopwords usa a forma crua; a normalização de número se aplica ao que sobra.
 */
function contentWords(sentences: readonly Sentence[], stopwords: ReadonlySet<string>): string[] {
  const words: string[] = [];
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (token.isWord && token.lower.length > 1 && !stopwords.has(token.lower)) {
        words.push(normalizeNumber(token.lower));
      }
    }
  }
  return words;
}

export const headingBodyMismatchPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  dataDeps: ["stopwords.pt"],

  run(ctx) {
    if (!ctx.config.headingBodyMismatch.enabled) return [];

    const stopwords = ctx.data.get<ReadonlySet<string>>("stopwords.pt");
    const minBody = ctx.config.headingBodyMismatch.minBodyContentWords;
    const blocks = ctx.doc.blocks;
    const findings: PassFinding[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const heading = blocks[i];
      if (heading.kind !== "heading") continue;

      const body: Block[] = [];
      for (let j = i + 1; j < blocks.length; j++) {
        const next = blocks[j];
        if (next.kind === "heading" && next.level <= heading.level) break;
        body.push(next);
      }
      if (body.length === 0) continue;

      const headingWords = new Set(contentWords(heading.sentences, stopwords));
      if (headingWords.size === 0) continue;

      const bodyWordList = body.flatMap((b) => contentWords(sentencesOf(b), stopwords));
      if (bodyWordList.length < minBody) continue;

      const bodyWords = new Set(bodyWordList);
      const overlaps = [...headingWords].some((w) => bodyWords.has(w));
      if (overlaps) continue;

      findings.push({
        criterion: CRITERION,
        category: "structural",
        span: { start: heading.start, end: heading.end, text: heading.text },
        severity: "info",
        requiresHuman: true,
        justification:
          "Nenhuma palavra de conteúdo deste título aparece no texto da seção que ele encabeça. É um " +
          "sinal FRACO (proxy de localização — o título antecipa o que o leitor vai encontrar? — nunca " +
          "prova): a comparação normaliza plural/singular (documentos ≈ documento), mas NÃO relaciona " +
          "derivações (solicitação ≠ solicitar) nem sinônimos. Confira o trecho antes de decidir; a " +
          "ferramenta não reescreve títulos.",
        meta: { headingContentWords: headingWords.size, bodyContentWords: bodyWordList.length },
      });
    }

    return findings;
  },
};
