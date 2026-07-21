/**
 * Segmentação em PARÁGRAFOS — a camada estrutural mínima (Princípio 2 · docs/DESIGN-camada1-*).
 *
 * Determinístico: agrupa frases consecutivas em parágrafos, quebrando onde o TEXTO-FONTE tem uma
 * linha em branco entre o fim de uma frase e o início da próxima. Mesma convenção do Tier 3
 * (`app/lib/paragraphs.ts`): parágrafo = bloco entre linhas em branco. Puro, sem rede.
 *
 * Só parágrafos: títulos, listas, seções exigem convenção de marcação (Markdown) e ficam FORA
 * desta etapa (ADR-026) — em prosa pura, parágrafo é o que se afere com alta confiança.
 */
import type { Paragraph, Sentence } from "../types";

/** Separador de parágrafo: uma linha em branco (≥2 `\n`, tolerando espaços/tabs entre eles). */
const RE_BLANK_LINE = /\n[ \t]*\n/;

function buildParagraph(source: string, group: readonly Sentence[]): Paragraph {
  const start = group[0].start;
  const end = group[group.length - 1].end;
  return {
    start,
    end,
    text: source.slice(start, end),
    sentences: group,
    wordCount: group.reduce((sum, s) => sum + s.wordCount, 0),
  };
}

export function segmentParagraphs(source: string, sentences: readonly Sentence[]): Paragraph[] {
  if (sentences.length === 0) return [];

  const paragraphs: Paragraph[] = [];
  let group: Sentence[] = [sentences[0]];

  for (let i = 1; i < sentences.length; i++) {
    const gap = source.slice(sentences[i - 1].end, sentences[i].start);
    if (RE_BLANK_LINE.test(gap)) {
      paragraphs.push(buildParagraph(source, group));
      group = [sentences[i]];
    } else {
      group.push(sentences[i]);
    }
  }
  paragraphs.push(buildParagraph(source, group));

  return paragraphs;
}
