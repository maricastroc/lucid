import type { AbbreviationLexicon, Document, Sentence } from "../types";
import { normalize } from "./normalize";
import { segmentParagraphs } from "./segment-paragraphs";
import { buildTextDocument, hasStructuralMarkers } from "./text-blocks";
import { attachTokens, tokenize } from "./tokenize";

export interface DocumentBuildServices {
  segmentSentences: (source: string, abbreviations: AbbreviationLexicon) => Sentence[];
  abbreviations: AbbreviationLexicon;
}

export function buildDocument(rawText: string, services: DocumentBuildServices): Document {
  const source = normalize(rawText);

  if (hasStructuralMarkers(source)) {
    return buildTextDocument(source, services);
  }

  const sentencesWithoutTokens = services.segmentSentences(source, services.abbreviations);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const blocks = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, blocks };
}
