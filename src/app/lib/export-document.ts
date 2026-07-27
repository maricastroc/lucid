import { buildDocument, toRawBlocks, type Block, type RawBlock } from "@/lucid";

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
