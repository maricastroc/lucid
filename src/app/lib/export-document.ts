import { buildDocument, resolveTableGrid, toRawBlocks, type Block, type RawBlock, type RawTableRow } from "@/lucid";
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

function tableToMarkdown(rows: readonly RawTableRow[]): string {
  const grid = resolveTableGrid(rows);
  if (grid.columns === 0) return "";

  const escape = (text: string): string => text.replace(/\|/g, "\\|");
  const lines = grid.rows.map((slots) => {
    const columns: string[] = Array.from({ length: grid.columns }, () => "");
    for (const slot of slots) {
      if (slot.cell === null) continue;
      columns[slot.column] = escape(slot.cell.blocks.join("<br>"));
    }
    return `| ${columns.join(" | ")} |`;
  });

  const divider = `| ${Array.from({ length: grid.columns }, () => "---").join(" | ")} |`;
  return [lines[0], divider, ...lines.slice(1)].join("\n");
}

export function documentToMarkdown(blocks: readonly RawBlock[]): string {
  if (blocks.length === 0) return "";
  const out = blocks.map((block) => {
    if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
    if (block.kind === "list") {
      return block.items.map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n");
    }
    if (block.kind === "table") return tableToMarkdown(block.rows);
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
      if (block.kind === "table") {
        const rows = block.rows
          .map((row) => {
            const cells = row.cells
              .map((cell) => {
                const tag = cell.header === true ? "th" : "td";
                const span = [
                  (cell.colSpan ?? 1) > 1 ? ` colspan="${cell.colSpan}"` : "",
                  (cell.rowSpan ?? 1) > 1 ? ` rowspan="${cell.rowSpan}"` : "",
                ].join("");
                const body = cell.blocks.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
                return `<${tag}${span}>${body}</${tag}>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("");
        return `<table>${rows}</table>`;
      }
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("\n");
}
