/**
 * Renders the audit report to HTML for printing. The markdown it reads is not arbitrary — it is
 * exactly what `buildAuditReport` writes, a closed set of constructs this project authors on both
 * sides. That is what lets a renderer this small be honest: a test walks a full report and refuses
 * any line it cannot account for, so nothing ever reaches the page as raw syntax.
 *
 * What the report carries is the author's own document, so every character is escaped first.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function emphasise(escaped: string): string {
  return (
    escaped
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(“"])_([^_]+)_(?=$|[\s).,;:”"])/g, "$1<em>$2</em>")
  );
}

export function renderInline(text: string): string {
  return text
    .split(/`([^`]+)`/g)
    .map((part, i) => (i % 2 === 1 ? `<code>${escapeHtml(part)}</code>` : emphasise(escapeHtml(part))))
    .join("");
}

type Alignment = "left" | "right" | "center";

function splitRow(line: string): string[] {
  return line
    .slice(1, line.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
}

function alignments(separator: string): Alignment[] {
  return splitRow(separator).map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });
}

const isTableSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line) && line.includes("-");

export function renderReportHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let at = 0;

  while (at < lines.length) {
    const line = lines[at];

    if (line.trim() === "") {
      at += 1;
      continue;
    }

    const fence = /^(`{3,})\s*$/.exec(line);
    if (fence !== null) {
      const closing = fence[1];
      const body: string[] = [];
      at += 1;
      while (at < lines.length && lines[at] !== closing) {
        body.push(lines[at]);
        at += 1;
      }
      at += 1;
      out.push(`<pre class="report-source"><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) {
      out.push("<hr />");
      at += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading !== null) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      at += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const body: string[] = [];
      while (at < lines.length && lines[at].startsWith("> ")) {
        body.push(`<p>${renderInline(lines[at].slice(2))}</p>`);
        at += 1;
      }
      out.push(`<blockquote>${body.join("")}</blockquote>`);
      continue;
    }

    if (line.startsWith("| ") && at + 1 < lines.length && isTableSeparator(lines[at + 1])) {
      const header = splitRow(line);
      const align = alignments(lines[at + 1]);
      at += 2;
      const body: string[][] = [];
      while (at < lines.length && lines[at].startsWith("| ")) {
        body.push(splitRow(lines[at]));
        at += 1;
      }
      out.push(renderTable(header, body, align));
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (at < lines.length && lines[at].startsWith("- ")) {
        items.push(`<li>${renderInline(lines[at].slice(2))}</li>`);
        at += 1;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    out.push(`<p>${renderInline(line)}</p>`);
    at += 1;
  }

  return out.join("\n");
}

function renderTable(header: readonly string[], body: readonly (readonly string[])[], align: readonly Alignment[]) {
  const cell = (tag: string, text: string, i: number): string =>
    `<${tag} style="text-align:${align[i] ?? "left"}">${renderInline(text)}</${tag}>`;
  const head = header.map((text, i) => cell("th", text, i)).join("");
  const rows = body.map((row) => `<tr>${row.map((text, i) => cell("td", text, i)).join("")}</tr>`).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}
