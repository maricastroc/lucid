const BLOCK_TAGS = /<\/?(?:p|div|br|tr|li|h[1-6]|section|article|table|blockquote)\b[^>]*>/gi;
const DROP_BLOCKS = /<(script|style|noscript|head)\b[^>]*>[\s\S]*?<\/\1>/gi;
const ANY_TAG = /<[^>]+>/g;

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ordm: "º",
  ordf: "ª",
  deg: "°",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    const replacement = ENTITIES[body.toLowerCase()];
    return replacement ?? whole;
  });
}

export function htmlToText(html: string): string {
  const withoutDropped = html.replace(DROP_BLOCKS, " ");
  const withBreaks = withoutDropped.replace(BLOCK_TAGS, "\n");
  const withoutTags = withBreaks.replace(ANY_TAG, " ");
  const decoded = decodeEntities(withoutTags);

  return decoded
    .replace(/\r/g, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeBytes(bytes: Uint8Array, contentType: string): string {
  const declared = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase();
  const encoding = declared === "iso-8859-1" || declared === "latin1" ? "latin1" : "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  const utf8 = decodeBytes(bytes, contentType);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("latin1").decode(bytes);
}
