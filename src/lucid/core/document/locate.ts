import type { Span } from "../types";
import { normalize } from "./normalize";
import { segmentSentences } from "./segment-sentences";

export function sentenceSpanAt(text: string, offset: number): Span {
  const source = normalize(text);
  const sentences = segmentSentences(source);
  if (sentences.length === 0) return { start: 0, end: source.length, text: source };

  for (const s of sentences) {
    if (offset >= s.start && offset < s.end) return { start: s.start, end: s.end, text: s.text };
  }
  const before = sentences.filter((s) => s.start <= offset);
  const chosen = before.length > 0 ? before[before.length - 1] : sentences[sentences.length - 1];
  return { start: chosen.start, end: chosen.end, text: chosen.text };
}
