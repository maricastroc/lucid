import type { AbbreviationLexicon, Document, Sentence } from "../types";
import { normalize } from "./normalize";
import { buildTextDocument } from "./text-blocks";

export interface DocumentBuildServices {
  segmentSentences: (source: string, abbreviations: AbbreviationLexicon) => Sentence[];
  abbreviations: AbbreviationLexicon;
}

export function buildDocument(rawText: string, services: DocumentBuildServices): Document {
  return buildTextDocument(normalize(rawText), services);
}
