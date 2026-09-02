import type { RawBlock, RawListItem, RawTableCell, RawTableRow } from "@/lucid/core/document/structured";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const BLOCK_TAG = /^\/?(p|div|br|li|ul|ol|tr|td|th|table|h[1-6]|blockquote|section|article)$/i;

function textOf(innerHtml: string): string {
  const separated = innerHtml.replace(/<([a-z0-9]+)\b[^>]*>|<\/([a-z0-9]+)>/gi, (tag, open: string, close: string) =>
    BLOCK_TAG.test(open ?? close ?? "") ? " " : "",
  );
  return decodeEntities(separated.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingClose(html: string, tagName: string, from: number): number | null {
  const tagRe = new RegExp(`<${tagName}\\b[^>]*>|<\\/${tagName}>`, "gi");
  tagRe.lastIndex = from;
  let depth = 1;
  for (let m = tagRe.exec(html); m !== null; m = tagRe.exec(html)) {
    if (m[0][1] === "/") {
      depth--;
      if (depth === 0) return m.index;
    } else {
      depth++;
    }
  }
  return null;
}

const MAX_LIST_LEVEL = 5;

function ownParagraphs(inner: string): string[] {
  let depth = 0;
  let ownHtml = "";
  const tagRe = /<(\/?)(ol|ul)\b[^>]*>/gi;
  let cursor = 0;
  for (let m = tagRe.exec(inner); m !== null; m = tagRe.exec(inner)) {
    if (m[1] === "") {
      if (depth === 0) ownHtml += inner.slice(cursor, m.index);
      depth += 1;
    } else {
      depth = Math.max(0, depth - 1);
      if (depth === 0) cursor = m.index + m[0].length;
    }
  }
  if (depth === 0) ownHtml += inner.slice(cursor);

  const paragraphs: string[] = [];
  const childRe = /<(p|h[1-6])\b[^>]*>/gi;
  for (let m = childRe.exec(ownHtml); m !== null; m = childRe.exec(ownHtml)) {
    const tag = m[1].toLowerCase();
    const openEnd = childRe.lastIndex;
    const closeStart = findMatchingClose(ownHtml, tag, openEnd);
    if (closeStart === null) break;
    const text = textOf(ownHtml.slice(openEnd, closeStart));
    if (text) paragraphs.push(text);
    childRe.lastIndex = closeStart + `</${tag}>`.length;
  }
  if (paragraphs.length > 0) return paragraphs;

  const flat = textOf(ownHtml);
  return flat ? [flat] : [];
}

function extractListItems(inner: string, ordered: boolean, level = 0): RawListItem[] {
  const items: RawListItem[] = [];
  const liOpenRe = /<li\b[^>]*>/gi;

  for (let m = liOpenRe.exec(inner); m !== null; m = liOpenRe.exec(inner)) {
    const openEnd = liOpenRe.lastIndex;
    const closeStart = findMatchingClose(inner, "li", openEnd);
    if (closeStart === null) break;
    const body = inner.slice(openEnd, closeStart);
    liOpenRe.lastIndex = closeStart + "</li>".length;

    const blocks = ownParagraphs(body);
    if (blocks.length > 0) items.push({ blocks, level, ordered });

    if (level >= MAX_LIST_LEVEL) continue;
    const nestedRe = /<(ol|ul)\b[^>]*>/gi;
    for (let n = nestedRe.exec(body); n !== null; n = nestedRe.exec(body)) {
      const nestedOpenEnd = nestedRe.lastIndex;
      const nestedClose = findMatchingClose(body, n[1], nestedOpenEnd);
      if (nestedClose === null) break;
      items.push(...extractListItems(body.slice(nestedOpenEnd, nestedClose), n[1].toLowerCase() === "ol", level + 1));
      nestedRe.lastIndex = nestedClose + `</${n[1]}>`.length;
    }
  }

  return items;
}

function spanAttribute(openTag: string, name: string): number | undefined {
  const raw = new RegExp(`\\b${name}\\s*=\\s*"?(\\d+)`, "i").exec(openTag)?.[1];
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 1 ? Math.trunc(value) : undefined;
}

function extractCellParagraphs(inner: string): string[] {
  const paragraphs: string[] = [];
  const childRe = /<(p|li|h[1-6])\b[^>]*>/gi;

  for (let m = childRe.exec(inner); m !== null; m = childRe.exec(inner)) {
    const tag = m[1].toLowerCase();
    const openEnd = childRe.lastIndex;
    const closeStart = findMatchingClose(inner, tag, openEnd);
    if (closeStart === null) break;
    const text = textOf(inner.slice(openEnd, closeStart));
    if (text) paragraphs.push(text);
    childRe.lastIndex = closeStart + `</${tag}>`.length;
  }

  if (paragraphs.length > 0) return paragraphs;

  return inner
    .split(/<br\b[^>]*>/i)
    .map(textOf)
    .filter((text) => text !== "");
}

function extractTableRows(inner: string): RawTableRow[] {
  const rows: RawTableRow[] = [];
  const trRe = /<tr\b[^>]*>/gi;

  for (let m = trRe.exec(inner); m !== null; m = trRe.exec(inner)) {
    const openEnd = trRe.lastIndex;
    const closeStart = findMatchingClose(inner, "tr", openEnd);
    if (closeStart === null) break;
    const rowInner = inner.slice(openEnd, closeStart);
    trRe.lastIndex = closeStart + "</tr>".length;

    const cells: RawTableCell[] = [];
    const cellRe = /<(td|th)\b([^>]*)>/gi;
    for (let c = cellRe.exec(rowInner); c !== null; c = cellRe.exec(rowInner)) {
      const tag = c[1].toLowerCase();
      const cellOpenEnd = cellRe.lastIndex;
      const cellCloseStart = findMatchingClose(rowInner, tag, cellOpenEnd);
      if (cellCloseStart === null) break;
      cells.push({
        blocks: extractCellParagraphs(rowInner.slice(cellOpenEnd, cellCloseStart)),
        colSpan: spanAttribute(c[2], "colspan"),
        rowSpan: spanAttribute(c[2], "rowspan"),
        header: tag === "th" ? true : undefined,
      });
      cellRe.lastIndex = cellCloseStart + `</${tag}>`.length;
    }

    if (cells.length > 0) rows.push({ cells });
  }

  return rows;
}

export function htmlToRawBlocks(html: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const topOpenRe = /<(h[1-6]|p|ul|ol|table)\b[^>]*>/gi;

  for (let m = topOpenRe.exec(html); m !== null; m = topOpenRe.exec(html)) {
    const tag = m[1].toLowerCase();
    const openEnd = topOpenRe.lastIndex;
    const closeStart = findMatchingClose(html, tag, openEnd);
    if (closeStart === null) break;
    const inner = html.slice(openEnd, closeStart);
    topOpenRe.lastIndex = closeStart + `</${tag}>`.length;

    if (tag === "p") {
      const text = textOf(inner);
      if (text) blocks.push({ kind: "paragraph", text });
      continue;
    }
    if (/^h[1-6]$/.test(tag)) {
      const text = textOf(inner);
      if (text) blocks.push({ kind: "heading", level: Number(tag[1]), text });
      continue;
    }
    if (tag === "table") {
      const rows = extractTableRows(inner);
      if (rows.length > 0) blocks.push({ kind: "table", rows });
      continue;
    }

    const ordered = tag === "ol";
    const items = extractListItems(inner, ordered);
    if (items.length > 0) blocks.push({ kind: "list", ordered, items });
  }

  return blocks;
}
