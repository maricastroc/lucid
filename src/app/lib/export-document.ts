import {
  buildDocument,
  normalizeListItem,
  resolveTableGrid,
  toRawBlocks,
  type Block,
  type RawBlock,
  type RawTableRow,
} from "@/lucid";
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

export async function documentToPdf(blocks: readonly RawBlock[], pageLabel: (page: number, total: number) => string) {
  const { exportPdf } = await import("@/exporters/pdf");
  return exportPdf(blocks, { footer: pageLabel });
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

type StoredItems = Extract<RawBlock, { kind: "list" }>["items"];

function listToMarkdown(items: StoredItems, ordered: boolean): string {
  const counters: number[] = [];
  return items
    .map((stored) => {
      const item = normalizeListItem(stored, ordered);
      counters.length = item.level + 1;
      counters[item.level] = (counters[item.level] ?? 0) + 1;
      const indent = "  ".repeat(item.level);
      const marker = item.ordered ? `${counters[item.level]}.` : "-";
      const [first, ...rest] = item.blocks;
      const head = `${indent}${marker} ${first}`;
      const tail = rest.map((paragraph: string) => `\n${indent}  ${paragraph}`).join("");
      return head + tail;
    })
    .join("\n");
}

function listToHtml(items: StoredItems, ordered: boolean): string {
  const tag = ordered ? "ol" : "ul";
  const cells = items
    .map((stored) => {
      const item = normalizeListItem(stored, ordered);
      const body = item.blocks.map((paragraph: string) => `<p>${escapeHtml(paragraph)}</p>`).join("");
      const style = item.level > 0 ? ` style="margin-left:${item.level * 1.4}em"` : "";
      return `<li${style}>${body}</li>`;
    })
    .join("");
  return `<${tag}>${cells}</${tag}>`;
}

export function documentToMarkdown(blocks: readonly RawBlock[]): string {
  if (blocks.length === 0) return "";
  const out = blocks.map((block) => {
    if (block.kind === "heading") return `${"#".repeat(block.level)} ${block.text}`;
    if (block.kind === "list") return listToMarkdown(block.items, block.ordered);
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
      if (block.kind === "list") return listToHtml(block.items, block.ordered);
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
