import type { AbbreviationLexicon, Block, Document, ListItemBlock, ParagraphBlock, Sentence, Token } from "../types";
import type { DocumentBuildServices } from "./model";
import { segmentAt } from "./structured";

const RE_HEADING = /^(#{1,6})([ \t]+)(\S.*?)[ \t\r]*$/;
const RE_LIST = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(\S.*?)[ \t\r]*$/;
const RE_BLANK = /^[ \t\r]*$/;
const RE_TERMINAL = /[.!?:;…]$/u;
const RE_WORD = /\p{L}[\p{L}\p{M}-]*/gu;
const RE_LOWERCASE = /\p{Ll}/u;

interface Line {
  readonly start: number;
  readonly text: string;
}

function splitLines(source: string): Line[] {
  const out: Line[] = [];
  let i = 0;
  for (;;) {
    let nl = source.indexOf("\n", i);
    if (nl === -1) nl = source.length;
    out.push({ start: i, text: source.slice(i, nl) });
    if (nl === source.length) break;
    i = nl + 1;
  }
  return out;
}

interface HeadingRange {
  readonly kind: "heading";
  readonly level: number;
  readonly start: number;
  readonly end: number;
}
interface ParagraphRange {
  readonly kind: "paragraph";
  readonly start: number;
  readonly end: number;
}
interface ItemRange {
  readonly start: number;
  readonly end: number;
  readonly level: number;
  readonly ordered: boolean;
}

const MAX_LIST_LEVEL = 5;

// Recuo marca o nível: um tab, ou cada dois espaços, desce um degrau.
function levelFromIndent(indent: string): number {
  const tabs = (indent.match(/\t/gu) ?? []).length;
  const spaces = indent.length - tabs;
  return Math.min(MAX_LIST_LEVEL, tabs + Math.floor(spaces / 2));
}
interface ListRange {
  readonly kind: "list";
  readonly ordered: boolean;
  readonly items: readonly ItemRange[];
}
type BlockRange = HeadingRange | ParagraphRange | ListRange;

function matchHeading(line: Line): HeadingRange | null {
  const m = RE_HEADING.exec(line.text);
  if (!m) return null;
  const contentStart = line.start + m[1].length + m[2].length;
  return { kind: "heading", level: m[1].length, start: contentStart, end: contentStart + m[3].length };
}

function matchListItem(line: Line): { ordered: boolean; range: ItemRange } | null {
  const m = RE_LIST.exec(line.text);
  if (!m) return null;
  const contentStart = line.start + m[1].length + m[2].length + m[3].length;
  const ordered = /\d/.test(m[2]);
  return {
    ordered,
    range: { start: contentStart, end: contentStart + m[4].length, level: levelFromIndent(m[1]), ordered },
  };
}

function lastWord(text: string): string | null {
  const words = text.match(RE_WORD);
  return words === null ? null : words[words.length - 1].toLowerCase();
}

function closesBlock(text: string, abbreviations: AbbreviationLexicon): boolean {
  const trimmed = text.replace(/[ \t\r]+$/u, "");
  if (RE_BLANK.test(trimmed)) return true;
  if (RE_HEADING.test(trimmed) || RE_LIST.test(trimmed)) return true;
  if (RE_TERMINAL.test(trimmed)) {
    if (!trimmed.endsWith(".")) return true;
    const word = lastWord(trimmed);
    return word === null || !abbreviations.blocking.has(word);
  }
  const words = trimmed.match(RE_WORD);
  return words !== null && words.length >= 2 && !RE_LOWERCASE.test(trimmed);
}

function startsList(lines: readonly Line[], index: number, abbreviations: AbbreviationLexicon): boolean {
  if (!RE_LIST.test(lines[index].text)) return false;
  return index === 0 || closesBlock(lines[index - 1].text, abbreviations);
}

export function hasStructuralMarkers(source: string): boolean {
  for (const line of splitLines(source)) {
    if (RE_HEADING.test(line.text) || RE_LIST.test(line.text)) return true;
  }
  return false;
}

function parseBlockRanges(source: string, abbreviations: AbbreviationLexicon): BlockRange[] {
  const lines = splitLines(source);
  const ranges: BlockRange[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (RE_BLANK.test(line.text)) {
      i++;
      continue;
    }

    const heading = matchHeading(line);
    if (heading) {
      ranges.push(heading);
      i++;
      continue;
    }

    const first = startsList(lines, i, abbreviations) ? matchListItem(line) : null;
    if (first) {
      const items: ItemRange[] = [first.range];
      let j = i + 1;
      while (j < lines.length) {
        const next = matchListItem(lines[j]);
        if (!next) break;
        items.push(next.range);
        j++;
      }
      ranges.push({ kind: "list", ordered: first.ordered, items });
      i = j;
      continue;
    }

    let end = line.start + line.text.length;
    let j = i + 1;
    while (j < lines.length) {
      const nl = lines[j];
      if (RE_BLANK.test(nl.text) || matchHeading(nl) || startsList(lines, j, abbreviations)) break;
      end = nl.start + nl.text.length;
      j++;
    }
    ranges.push({ kind: "paragraph", start: line.start, end });
    i = j;
  }

  return ranges;
}

interface Segmented {
  sentences: Sentence[];
  tokens: Token[];
  wordCount: number;
  start: number;
  end: number;
}

function segmentRange(source: string, start: number, end: number, services: DocumentBuildServices): Segmented | null {
  const seg = segmentAt(source.slice(start, end), start, services);
  if (seg.sentences.length === 0) return null;
  return {
    sentences: seg.sentences,
    tokens: seg.tokens,
    wordCount: seg.wordCount,
    start: seg.sentences[0].start,
    end: seg.sentences[seg.sentences.length - 1].end,
  };
}

export function buildTextDocument(source: string, services: DocumentBuildServices): Document {
  const ranges = parseBlockRanges(source, services.abbreviations);
  const sentences: Sentence[] = [];
  const tokens: Token[] = [];
  const blocks: Block[] = [];

  const collect = (seg: Segmented) => {
    sentences.push(...seg.sentences);
    tokens.push(...seg.tokens);
  };

  for (const range of ranges) {
    if (range.kind === "heading") {
      const seg = segmentRange(source, range.start, range.end, services);
      if (!seg) continue;
      collect(seg);
      blocks.push({
        kind: "heading",
        level: range.level,
        start: seg.start,
        end: seg.end,
        text: source.slice(seg.start, seg.end),
        sentences: seg.sentences,
        wordCount: seg.wordCount,
      });
      continue;
    }

    if (range.kind === "paragraph") {
      const seg = segmentRange(source, range.start, range.end, services);
      if (!seg) continue;
      collect(seg);
      blocks.push({
        kind: "paragraph",
        start: seg.start,
        end: seg.end,
        text: source.slice(seg.start, seg.end),
        sentences: seg.sentences,
        wordCount: seg.wordCount,
      });
      continue;
    }

    const items: ListItemBlock[] = [];
    for (const item of range.items) {
      const seg = segmentRange(source, item.start, item.end, services);
      if (!seg) continue;
      collect(seg);
      const paragraph: ParagraphBlock = {
        kind: "paragraph",
        start: seg.start,
        end: seg.end,
        text: source.slice(seg.start, seg.end),
        sentences: seg.sentences,
        wordCount: seg.wordCount,
      };
      items.push({
        kind: "listItem",
        start: seg.start,
        end: seg.end,
        text: paragraph.text,
        sentences: seg.sentences,
        wordCount: seg.wordCount,
        level: item.level,
        ordered: item.ordered,
        blocks: [paragraph],
      });
    }
    if (items.length === 0) continue;
    const start = items[0].start;
    const end = items[items.length - 1].end;
    blocks.push({ kind: "list", ordered: range.ordered, start, end, text: source.slice(start, end), items });
  }

  return { source, sentences, tokens, blocks };
}
