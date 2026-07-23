import type { Block, Document, ListItemBlock, Sentence, Token } from "../types";
import type { DocumentBuildServices } from "./model";
import { normalize } from "./normalize";
import { attachTokens, tokenize } from "./tokenize";

export type RawBlock =
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] };

function shiftToken(t: Token, off: number): Token {
  return { ...t, start: t.start + off, end: t.end + off };
}
function shiftSentence(s: Sentence, off: number): Sentence {
  return { ...s, start: s.start + off, end: s.end + off, tokens: s.tokens.map((t) => shiftToken(t, off)) };
}

function segmentAt(
  text: string,
  offset: number,
  services: DocumentBuildServices,
): { sentences: Sentence[]; tokens: Token[]; wordCount: number } {
  const localTokens = tokenize(text);
  const localSents = attachTokens(services.segmentSentences(text, services.abbreviations), localTokens);
  const tokens = localTokens.map((t) => shiftToken(t, offset));
  const sentences = localSents.map((s) => shiftSentence(s, offset));
  const wordCount = sentences.reduce((n, s) => n + s.wordCount, 0);
  return { sentences, tokens, wordCount };
}

export function buildStructuredDocument(rawBlocks: readonly RawBlock[], services: DocumentBuildServices): Document {
  let source = "";
  const blocks: Block[] = [];
  const sentences: Sentence[] = [];
  const tokens: Token[] = [];

  const place = (text: string, separator: string): { start: number; end: number } => {
    if (source.length > 0) source += separator;
    const start = source.length;
    source += normalize(text);
    return { start, end: source.length };
  };

  for (const rb of rawBlocks) {
    if (rb.kind === "paragraph" || rb.kind === "heading") {
      const { start, end } = place(rb.text, "\n\n");
      const seg = segmentAt(source.slice(start, end), start, services);
      sentences.push(...seg.sentences);
      tokens.push(...seg.tokens);
      const base = { start, end, text: source.slice(start, end), sentences: seg.sentences, wordCount: seg.wordCount };
      blocks.push(rb.kind === "heading" ? { kind: "heading", level: rb.level, ...base } : { kind: "paragraph", ...base });
      continue;
    }

    const items: ListItemBlock[] = [];
    let listStart = -1;
    rb.items.forEach((itemText, idx) => {
      const { start, end } = place(itemText, idx === 0 ? "\n\n" : "\n");
      if (idx === 0) listStart = start;
      const seg = segmentAt(source.slice(start, end), start, services);
      sentences.push(...seg.sentences);
      tokens.push(...seg.tokens);
      items.push({ kind: "listItem", start, end, text: source.slice(start, end), sentences: seg.sentences, wordCount: seg.wordCount });
    });
    if (items.length > 0) {
      const listEnd = items[items.length - 1].end;
      blocks.push({ kind: "list", ordered: rb.ordered, start: listStart, end: listEnd, text: source.slice(listStart, listEnd), items });
    }
  }

  return { source, sentences, tokens, blocks };
}
