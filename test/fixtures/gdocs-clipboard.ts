import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const at = (name: string): string => resolve(process.cwd(), "test/fixtures", name);

export const GDOCS_HTML = readFileSync(at("gdocs-clipboard.html"), "utf8");

export const GDOCS_PLAIN = readFileSync(at("gdocs-clipboard.txt"), "utf8");

export function gdocsExcerpt(): { html: string; plain: string } {
  const start = GDOCS_HTML.indexOf("<p dir");
  const list = GDOCS_HTML.indexOf("</ol>") + "</ol>".length;
  const html = GDOCS_HTML.slice(start, list);

  const plain = html
    .split(/<\/(?:p|li)>/)
    .map((chunk) =>
      chunk
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim(),
    )
    .filter((line) => line !== "")
    .join("\n");
  return { html, plain };
}
