import type { Document, Sentence } from "../types";
import { normalize } from "./normalize";
import { segmentParagraphs } from "./segment-paragraphs";
import { attachTokens, tokenize } from "./tokenize";

/**
 * Serviços de documento que um `LocaleBundle` pode fornecer (ADR-031). `normalize` (NFC) e
 * `tokenize` são NEUTROS de idioma e ficam no core como default — não entram no bundle a menos
 * que um script não-latino realmente exija (YAGNI agora). Só a segmentação de frases carrega uma
 * dependência de idioma (o set de abreviações), por isso é o único parametrizável aqui.
 */
export interface DocumentBuildServices {
  segmentSentences: (source: string, abbreviations: ReadonlySet<string>) => Sentence[];
  abbreviations: ReadonlySet<string>;
}

export function buildDocument(rawText: string, services: DocumentBuildServices): Document {
  const source = normalize(rawText);
  const sentencesWithoutTokens = services.segmentSentences(source, services.abbreviations);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const paragraphs = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, paragraphs };
}
