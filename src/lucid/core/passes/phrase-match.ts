/**
 * Matcher de FRASES FEITAS contíguas — compartilhado pelos passes de léxico multipalavra
 * (redundância, perífrase). Mesma disciplina do matcher de jargão: contiguidade estrita
 * (token-a-token, `isWord && lower === esperado`), longest-match-first, zero sobreposição (o
 * cursor pula para depois do match). Determinístico e puro.
 */
import type { Sentence, Token } from "../types";
import type { PhraseEntry, PhrasePrepared } from "../data/types";

export interface PhraseHit {
  start: number;
  end: number;
  text: string;
  entry: PhraseEntry;
}

/** Tenta casar, a partir de `index`, a frase mais longa cadastrada para a palavra desse token. */
function matchAt(tokens: readonly Token[], index: number, byFirstWord: PhrasePrepared): { endIndex: number; entry: PhraseEntry } | null {
  const first = tokens[index];
  if (!first.isWord) return null;
  const candidates = byFirstWord.get(first.lower);
  if (!candidates) return null;

  for (const candidate of candidates) {
    let matched = true;
    for (let w = 1; w < candidate.words.length; w++) {
      const token = tokens[index + w];
      if (!token || !token.isWord || token.lower !== candidate.words[w]) {
        matched = false;
        break;
      }
    }
    if (matched) return { endIndex: index + candidate.words.length - 1, entry: candidate.entry };
  }
  return null;
}

/** Todas as ocorrências de frase numa frase (oração), sem sobreposição, em ordem de leitura. */
export function matchPhrasesInSentence(sentence: Sentence, byFirstWord: PhrasePrepared, source: string): PhraseHit[] {
  const tokens = sentence.tokens;
  const hits: PhraseHit[] = [];
  for (let i = 0; i < tokens.length; ) {
    const m = matchAt(tokens, i, byFirstWord);
    if (!m) {
      i++;
      continue;
    }
    const start = tokens[i].start;
    const end = tokens[m.endIndex].end;
    hits.push({ start, end, text: source.slice(start, end), entry: m.entry });
    i = m.endIndex + 1; // sem sobreposição
  }
  return hits;
}
