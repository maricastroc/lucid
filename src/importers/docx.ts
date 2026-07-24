import mammoth from "mammoth";
import type { Document } from "@/lucid";
import { buildStructuredDocument, type RawBlock } from "@/lucid/core/document/structured";
import type { DocumentBuildServices } from "@/lucid/core/document/model";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function textOf(innerHtml: string): string {
  return decodeEntities(innerHtml.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
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

function extractListItems(inner: string): string[] {
  const items: string[] = [];
  const liOpenRe = /<li\b[^>]*>/gi;
  for (let m = liOpenRe.exec(inner); m !== null; m = liOpenRe.exec(inner)) {
    const openEnd = liOpenRe.lastIndex;
    const closeStart = findMatchingClose(inner, "li", openEnd);
    if (closeStart === null) break;
    const text = textOf(inner.slice(openEnd, closeStart));
    if (text) items.push(text);
    liOpenRe.lastIndex = closeStart + "</li>".length;
  }
  return items;
}

export function htmlToRawBlocks(html: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const topOpenRe = /<(h[1-6]|p|ul|ol)\b[^>]*>/gi;

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

    const items = extractListItems(inner);
    if (items.length > 0) blocks.push({ kind: "list", ordered: tag === "ol", items });
  }

  return blocks;
}

export async function importDocx(bytes: ArrayBuffer, services: DocumentBuildServices): Promise<Document> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes });
  return buildStructuredDocument(htmlToRawBlocks(html), services);
}
