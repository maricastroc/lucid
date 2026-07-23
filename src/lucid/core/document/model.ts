import type { Document, Sentence } from "../types";
import { normalize } from "./normalize";
import { segmentParagraphs } from "./segment-paragraphs";
import { attachTokens, tokenize } from "./tokenize";

export interface DocumentBuildServices {
  segmentSentences: (source: string, abbreviations: ReadonlySet<string>) => Sentence[];
  abbreviations: ReadonlySet<string>;
}

export function buildDocument(rawText: string, services: DocumentBuildServices): Document {
  const source = normalize(rawText);
  const sentencesWithoutTokens = services.segmentSentences(source, services.abbreviations);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const blocks = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, blocks };
}
