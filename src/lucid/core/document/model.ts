/**
 * Montagem do `Document` a partir de um texto bruto (docs/ARQUITETURA.md §7, passos 1–3).
 */
import type { Document } from "../types";
import { normalize } from "./normalize";
import { segmentSentences } from "./segment-sentences";
import { segmentParagraphs } from "./segment-paragraphs";
import { attachTokens, tokenize } from "./tokenize";

/**
 * Constrói um `Document` a partir do texto bruto de entrada: normaliza (NFC) uma única
 * vez, segmenta em frases e tokeniza. `Document.source` é sempre o texto
 * pós-normalização — todo offset de qualquer `Sentence`/`Token`/`Finding` downstream é
 * relativo a ele, nunca ao texto bruto recebido aqui.
 */
export function buildDocument(rawText: string): Document {
  const source = normalize(rawText);
  const sentencesWithoutTokens = segmentSentences(source);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const paragraphs = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, paragraphs };
}
