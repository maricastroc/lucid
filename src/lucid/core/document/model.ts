import type { Document } from "../types";
import { normalize } from "./normalize";
import { segmentSentences } from "./segment-sentences";
import { segmentParagraphs } from "./segment-paragraphs";
import { attachTokens, tokenize } from "./tokenize";

export function buildDocument(rawText: string): Document {
  const source = normalize(rawText);
  const sentencesWithoutTokens = segmentSentences(source);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const paragraphs = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, paragraphs };
}
