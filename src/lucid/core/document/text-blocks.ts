import type { Block, Document, ListItemBlock, Sentence, Token } from "../types";
import type { DocumentBuildServices } from "./model";
import { segmentAt } from "./structured";

/**
 * Reconhecedor estrutural determinístico para texto simples / Markdown (F4).
 *
 * O caminho `analyze()` (texto colado/digitado) só produzia parágrafos, deixando
 * MORTOS os critérios de "Localizável" (título longo, salto de nível, título sem
 * eco, lista de um item) — que só rodavam via importação .docx. Este módulo os
 * revive reconhecendo convenções EXPLÍCITAS de marcação:
 * - títulos ATX: `#`..`######` + espaço + texto (nível = nº de `#`);
 * - itens de lista: `-`/`*`/`+` ou `1.`/`1)` + espaço + texto.
 *
 * Diferente de `buildStructuredDocument` (que RECONSTRÓI o source com separadores,
 * ok para o docx), aqui o `source` continua sendo o texto ORIGINAL normalizado: os
 * offsets dos findings apontam para os caracteres reais que o usuário colou, então
 * a marcação na UI permanece alinhada. Cada bloco é segmentado em ISOLAMENTO (via
 * `segmentAt`), o que conserta a fusão "título sem pontuação + corpo" que a
 * segmentação sobre o texto inteiro provocaria.
 *
 * Só marcação explícita conta: um "título" sem `#` continua sendo parágrafo — a
 * norma trata detecção de título por heurística como sinal fraco, então aqui vale
 * precisão > recall (nunca inventa estrutura que o autor não marcou).
 */

const RE_HEADING = /^(#{1,6})([ \t]+)(\S.*?)[ \t\r]*$/;
const RE_LIST = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(\S.*?)[ \t\r]*$/;
const RE_BLANK = /^[ \t\r]*$/;

interface Line {
  readonly start: number;
  readonly text: string;
}

/** Linhas com offset de início; `text` exclui o `\n` terminal. */
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
  return { ordered: /\d/.test(m[2]), range: { start: contentStart, end: contentStart + m[4].length } };
}

export function hasStructuralMarkers(source: string): boolean {
  for (const line of splitLines(source)) {
    if (RE_HEADING.test(line.text) || RE_LIST.test(line.text)) return true;
  }
  return false;
}

function parseBlockRanges(source: string): BlockRange[] {
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

    const first = matchListItem(line);
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
      if (RE_BLANK.test(nl.text) || matchHeading(nl) || matchListItem(nl)) break;
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

/** Segmenta uma faixa do source e devolve as fronteiras reais (a partir das frases). */
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
  const ranges = parseBlockRanges(source);
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
      items.push({
        kind: "listItem",
        start: seg.start,
        end: seg.end,
        text: source.slice(seg.start, seg.end),
        sentences: seg.sentences,
        wordCount: seg.wordCount,
      });
    }
    if (items.length === 0) continue;
    const start = items[0].start;
    const end = items[items.length - 1].end;
    blocks.push({ kind: "list", ordered: range.ordered, start, end, text: source.slice(start, end), items });
  }

  return { source, sentences, tokens, blocks };
}
