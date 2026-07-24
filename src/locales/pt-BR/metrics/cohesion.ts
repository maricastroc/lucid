import type { CohesionMetrics, ConnectiveClass, Document } from "@/lucid/core/types";
import { normalizeNumber } from "../services/normalize-number";

/**
 * Métricas de coesão de superfície (ADR-061), 100% determinísticas, sem LSA nem
 * embeddings (que "adivinhariam" sentido — proibido na Camada 1). Duas famílias:
 * coesão referencial lexical (continuidade de palavras de conteúdo entre frases
 * vizinhas) e incidência/classe de conectivos de discurso. São DESCRITORES: não
 * têm direção de "melhor" e nunca entram no placar.
 */

export interface ConnectiveEntry {
  phrase: string;
  class: ConnectiveClass;
}
interface ConnectiveCompiled {
  words: string[];
  cls: ConnectiveClass;
}
export interface ConnectivesIndex {
  byFirstWord: ReadonlyMap<string, readonly ConnectiveCompiled[]>;
}

export function compileConnectives(entries: readonly ConnectiveEntry[]): ConnectivesIndex {
  const byFirstWord = new Map<string, ConnectiveCompiled[]>();
  for (const e of entries) {
    const words = e.phrase.split(" ");
    const compiled: ConnectiveCompiled = { words, cls: e.class };
    const list = byFirstWord.get(words[0]);
    if (list) list.push(compiled);
    else byFirstWord.set(words[0], [compiled]);
  }

  for (const list of byFirstWord.values()) list.sort((a, b) => b.words.length - a.words.length);
  return { byFirstWord };
}

function emptyByClass(): Record<ConnectiveClass, number> {
  return { additive: 0, adversative: 0, causal: 0, temporal: 0, conclusive: 0 };
}

function contentSet(
  tokens: Document["sentences"][number]["tokens"],
  stopwords: ReadonlySet<string>,
): Set<string> {
  const set = new Set<string>();
  for (const t of tokens) {
    if (t.isWord && t.lower.length > 1 && !stopwords.has(t.lower)) set.add(normalizeNumber(t.lower));
  }
  return set;
}

export function createCohesion(deps: {
  stopwords: ReadonlySet<string>;
  connectives: ConnectivesIndex;
}): (doc: Document) => CohesionMetrics {
  return function cohesion(doc: Document): CohesionMetrics {
    const sets = doc.sentences.map((s) => contentSet(s.tokens, deps.stopwords));
    let overlapSum = 0;
    let gaps = 0;
    let pairs = 0;
    for (let i = 0; i + 1 < sets.length; i++) {
      const a = sets[i];
      const b = sets[i + 1];
      pairs++;
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      const union = new Set([...a, ...b]).size;
      overlapSum += union === 0 ? 0 : inter / union;
      if (inter === 0) gaps++;
    }
    const referentialOverlap = pairs === 0 ? 0 : overlapSum / pairs;
    const adjacentGapRatio = pairs === 0 ? 0 : gaps / pairs;

    const byClass = emptyByClass();
    let totalConnectives = 0;
    for (const sentence of doc.sentences) {
      const words = sentence.tokens.filter((t) => t.isWord);
      for (let i = 0; i < words.length; ) {
        const candidates = deps.connectives.byFirstWord.get(words[i].lower);
        let matched: ConnectiveCompiled | null = null;
        if (candidates) {
          for (const cand of candidates) {
            if (i + cand.words.length > words.length) continue;
            let ok = true;
            for (let k = 0; k < cand.words.length; k++) {
              if (words[i + k].lower !== cand.words[k]) {
                ok = false;
                break;
              }
            }
            if (ok) {
              matched = cand;
              break;
            }
          }
        }
        if (matched) {
          byClass[matched.cls]++;
          totalConnectives++;
          i += matched.words.length;
        } else {
          i++;
        }
      }
    }
    const docWords = doc.tokens.filter((t) => t.isWord).length;
    const connectivesPer100Words = docWords === 0 ? 0 : (totalConnectives / docWords) * 100;

    return { referentialOverlap, adjacentGapRatio, connectivesPer100Words, connectivesByClass: byClass };
  };
}
