import { median, percentile, type PdfLine } from "./geometry";

const PARAGRAPH_GAP = 1.4;
const SHORT_LINE = 0.1;
const MARGIN_SLACK = 0.02;
const MAX_HEADING = 60;

const OPENING =
  /^[ \t]*(?:art(?:igo)?s?[ \t]*\.?[ \t]*\d|§|par[áa]grafo[ \t]+[úu]nico|inciso|cl[áa]usula|cap[íi]tulo|subse[çc][ãa]o|se[çc][ãa]o|t[íi]tulo|livro|anexo)\b/i;
const BULLET = /^[ \t]*[*\-•●○◦·–—][ \t]+\S/;
const ITEM_LABEL = /^[ \t]*(?:\d+(?:\.\d+)*[.)–-]?|[a-z][.)]|[ivxlcdm]+[.)])[ \t]+\S/i;
const HYPHEN_END = /(\p{L})-$/u;

export interface PageMargins {
  readonly bodyLeft: number;
  readonly bodyRight: number;
}

export interface ParagraphMetrics {
  readonly leading: number;
  readonly slack: number;
  readonly byPage: ReadonlyMap<number, PageMargins>;
}

export interface ParagraphResult {
  readonly text: string;
  readonly dehyphenated: number;
  readonly shortLineBreaks: number;
}

const FALLBACK: PageMargins = { bodyLeft: 0, bodyRight: 0 };

export function metricsOf(lines: readonly PdfLine[], pageWidth: number): ParagraphMetrics {
  const gaps: number[] = [];
  const pages = new Map<number, PdfLine[]>();

  for (const [index, line] of lines.entries()) {
    const group = pages.get(line.page);
    if (group) group.push(line);
    else pages.set(line.page, [line]);

    if (index === 0) continue;
    const previous = lines[index - 1];
    if (previous.page !== line.page) continue;
    const gap = line.top - previous.top;
    if (gap > 0) gaps.push(gap);
  }

  const byPage = new Map<number, PageMargins>();
  for (const [page, group] of pages) {
    byPage.set(page, {
      bodyLeft: percentile(
        group.map((line) => line.left),
        0.25,
      ),
      bodyRight: percentile(
        group.map((line) => line.right),
        0.9,
      ),
    });
  }

  const heights = lines.map((line) => line.height);

  return {
    leading: gaps.length > 0 ? median(gaps) : median(heights) * 1.2,
    slack: pageWidth * MARGIN_SLACK,
    byPage,
  };
}

const marginsOf = (metrics: ParagraphMetrics, page: number): PageMargins => metrics.byPage.get(page) ?? FALLBACK;

function looksTitled(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length > 0 && trimmed.length <= MAX_HEADING && trimmed === trimmed.toUpperCase() && /\p{Lu}/u.test(trimmed)
  );
}

const opensStructure = (text: string): boolean =>
  ITEM_LABEL.test(text) || BULLET.test(text) || OPENING.test(text) || looksTitled(text);

function isLineBreakHyphen(previous: PdfLine, next: PdfLine, metrics: ParagraphMetrics): boolean {
  return (
    HYPHEN_END.test(previous.text) &&
    previous.right >= marginsOf(metrics, previous.page).bodyRight - metrics.slack &&
    next.left <= marginsOf(metrics, next.page).bodyLeft + metrics.slack
  );
}

export function buildParagraphs(lines: readonly PdfLine[], metrics: ParagraphMetrics): ParagraphResult {
  const blocks: string[] = [];
  let dehyphenated = 0;
  let shortLineBreaks = 0;

  for (const [index, line] of lines.entries()) {
    if (index === 0) {
      blocks.push(line.text);
      continue;
    }

    const previous = lines[index - 1];
    const samePage = previous.page === line.page;
    const gap = line.top - previous.top;

    const byGap = samePage && metrics.leading > 0 && gap > metrics.leading * PARAGRAPH_GAP;
    const byStructure = opensStructure(line.text) || looksTitled(previous.text);
    const { bodyLeft, bodyRight } = marginsOf(metrics, previous.page);
    const short = samePage && previous.right < bodyRight - (bodyRight - bodyLeft) * SHORT_LINE;

    if (byGap || byStructure) {
      blocks.push(line.text);
      continue;
    }

    if (short) {
      shortLineBreaks += 1;
      blocks.push(line.text);
      continue;
    }

    const at = blocks.length - 1;

    if (isLineBreakHyphen(previous, line, metrics)) {
      blocks[at] = blocks[at].replace(/-$/, "") + line.text;
      dehyphenated += 1;
      continue;
    }

    blocks[at] += ` ${line.text}`;
  }

  return {
    text: blocks
      .map((block) => block.trimEnd())
      .filter((block) => block !== "")
      .join("\n\n"),
    dehyphenated,
    shortLineBreaks,
  };
}
