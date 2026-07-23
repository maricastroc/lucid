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
  return decodeEntities(innerHtml.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

export function htmlToRawBlocks(html: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const blockRe = /<(h[1-6]|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  for (let m = blockRe.exec(html); m !== null; m = blockRe.exec(html)) {
    const tag = m[1].toLowerCase();
    const inner = m[2];

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

    const ordered = tag === "ol";
    const items: string[] = [];
    const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    for (let li = liRe.exec(inner); li !== null; li = liRe.exec(inner)) {
      const text = textOf(li[1]);
      if (text) items.push(text);
    }
    if (items.length > 0) blocks.push({ kind: "list", ordered, items });
  }

  return blocks;
}

export async function importDocx(bytes: ArrayBuffer, services: DocumentBuildServices): Promise<Document> {
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes });
  return buildStructuredDocument(htmlToRawBlocks(html), services);
}
