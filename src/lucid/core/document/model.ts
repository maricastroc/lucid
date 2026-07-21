/**
 * O IMPORTADOR de TEXTO PURO (docs/ARQUITETURA.md §7; docs/DESIGN-modelo-independente-de-formato.md).
 *
 * `buildDocument` é a FRONTEIRA DE FORMATO: é o único produtor do `Document` canônico hoje, e é
 * especificamente o importador de texto puro. Formatos futuros (DOCX/PDF/HTML) serão importadores
 * IRMÃOS — produtores alternativos do MESMO `Document` — sem tocar em nenhum detector da Camada 1
 * (que é cega ao formato). Ver o contrato de importador no design doc.
 */
import type { Document } from "../types";
import { normalize } from "./normalize";
import { segmentSentences } from "./segment-sentences";
import { segmentParagraphs } from "./segment-paragraphs";
import { attachTokens, tokenize } from "./tokenize";

/**
 * Constrói o `Document` canônico a partir de texto puro: normaliza (NFC) uma única vez, segmenta
 * em frases, tokeniza e agrupa parágrafos. `Document.source` é sempre o texto pós-normalização —
 * todo offset downstream é relativo a ele, nunca ao bruto. Um importador de DOCX/PDF faria o
 * análogo com o texto EXTRAÍDO (+ blocos ricos do formato), produzindo o mesmo tipo `Document`.
 */
export function buildDocument(rawText: string): Document {
  const source = normalize(rawText);
  const sentencesWithoutTokens = segmentSentences(source);
  const tokens = tokenize(source);
  const sentences = attachTokens(sentencesWithoutTokens, tokens);
  const paragraphs = segmentParagraphs(source, sentences);

  return { source, sentences, tokens, paragraphs };
}
