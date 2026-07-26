import type { Block, PassFinding, Pass, Sentence } from "@/lucid/core/types";
import type { NominalizationEntry } from "../datasets/types";
import { normalizeNumber } from "../services/normalize-number";

const CRITERION = "heading_body_mismatch";

function sentencesOf(block: Block): readonly Sentence[] {
  return block.kind === "list" ? block.items.flatMap((item) => item.sentences) : block.sentences;
}

/**
 * Collapses a word to the form the echo is compared on.
 *
 * A heading names the act with a noun ("Pagamento da taxa") and the body performs it with
 * the verb ("para pagar, o interessado…"), so a literal comparison reads the echo as
 * absent and the criterion speaks where it should stay quiet. The bridge is the CURATED
 * nominalization map — the same one the nominalization criterion trusts — and not a stem
 * prefix: the prefix real pairs share ranges from 2 chars ("análise/analisar") to 9
 * ("apresentação/apresentar"), so no constant separates derivation from coincidence, and a
 * wrong match here SILENCES a finding instead of adding a visible one.
 *
 * Recall is therefore bounded by the lexicon, which is the `curated` coverage tier the
 * scorecard already declares — a pair nobody curated still reads as a mismatch.
 */
function canonical(lower: string, nominalizations: ReadonlyMap<string, NominalizationEntry>): string {
  return nominalizations.get(lower)?.verb ?? normalizeNumber(lower);
}

function contentWords(
  sentences: readonly Sentence[],
  stopwords: ReadonlySet<string>,
  nominalizations: ReadonlyMap<string, NominalizationEntry>,
): string[] {
  const words: string[] = [];
  for (const sentence of sentences) {
    for (const token of sentence.tokens) {
      if (token.isWord && token.lower.length > 1 && !stopwords.has(token.lower)) {
        words.push(canonical(token.lower, nominalizations));
      }
    }
  }
  return words;
}

export const headingBodyMismatchPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  dataDeps: ["stopwords.pt", "nominalizacoes.pt"],

  run(ctx) {
    if (!ctx.config.headingBodyMismatch.enabled) return [];

    const stopwords = ctx.data.get<ReadonlySet<string>>("stopwords.pt");
    const nominalizations = ctx.data.get<ReadonlyMap<string, NominalizationEntry>>("nominalizacoes.pt");
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

      const headingWords = new Set(contentWords(heading.sentences, stopwords, nominalizations));
      if (headingWords.size === 0) continue;

      const bodyWordList = body.flatMap((b) => contentWords(sentencesOf(b), stopwords, nominalizations));
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
          "prova): a comparação normaliza plural/singular (documentos ≈ documento) e atravessa as " +
          "derivações do glossário curado (pagamento ≈ pagar), mas não alcança derivação fora dele nem " +
          "sinônimos. Confira o trecho antes de decidir; a ferramenta não reescreve títulos.",
        meta: { headingContentWords: headingWords.size, bodyContentWords: bodyWordList.length },
      });
    }

    return findings;
  },
};
