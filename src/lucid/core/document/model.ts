import type { Document, Sentence } from "../types";
import { normalize } from "./normalize";
import { segmentParagraphs } from "./segment-paragraphs";
import { buildTextDocument, hasStructuralMarkers } from "./text-blocks";
import { attachTokens, tokenize } from "./tokenize";

export interface DocumentBuildServices {
  segmentSentences: (source: string, abbreviations: ReadonlySet<string>) => Sentence[];
  abbreviations: ReadonlySet<string>;
}

export function buildDocument(rawText: string, services: DocumentBuildServices): Document {
  const source = normalize(rawText);

  // Texto com marcação estrutural EXPLÍCITA (títulos ATX / listas) usa o
  // reconhecedor de blocos (F4), preservando offsets. Sem marcação, o caminho de
  // prosa é idêntico ao anterior — byte a byte — para não mover nenhum diagnóstico.
  if (hasStructuralMarkers(source)) {
    return buildTextDocument(source, services);
  }

  const sentencesWithoutTokens = services.segmentSentences(source, services.abbreviations);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const blocks = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, blocks };
}
