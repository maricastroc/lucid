import { buildDocument, toRawBlocks, type Block, type RawBlock } from "@/lucid";
import { escapeHtml } from "./report-html";

export function exportableBlocks(text: string, structured: readonly Block[] | null): RawBlock[] {
  if (structured !== null) return toRawBlocks(structured);
  return toRawBlocks(buildDocument(text).blocks);
}

export function hasRecoverableStructure(blocks: readonly RawBlock[]): boolean {
  return blocks.some((block) => block.kind !== "paragraph");
}

export async function documentToDocx(blocks: readonly RawBlock[]): Promise<Uint8Array> {
  const { blocksToDocx } = await import("@/exporters/docx");
  return blocksToDocx(blocks);
}

export function documentToMarkdown(blocks: readonly RawBlock[]): string {
  if (blocks.length === 0) return "";
  const out = blocks.map((block) => {
    if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
    if (block.kind === "list") {
      return block.items.map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n");
    }
    return block.text;
  });
  return `${out.join("\n\n")}\n`;
}

export function documentToHtml(blocks: readonly RawBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "heading") {
        const level = Math.min(6, Math.max(1, block.level));
        return `<h${level}>${escapeHtml(block.text)}</h${level}>`;
      }
      if (block.kind === "list") {
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        return `<${tag}>${items}</${tag}>`;
      }
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("\n");
}
