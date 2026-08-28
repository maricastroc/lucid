import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, type Finding, type Span } from "../../src/lucid";
import { rewriteLocalePtBR } from "../../src/locales/pt-BR/tier3";
import { rewriteTargetAt } from "../../src/app/lib/paragraphs";

const EMIT = process.env.CONTEXT_MEASURE === "1";
const CORPUS_DIR = path.join(process.cwd(), "corpus/v1/text");

const WINDOWS = [0, 1, 2, 3] as const;

function paragraphRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const block of text.split(/\n{2,}/)) {
    const start = text.indexOf(block, cursor);
    ranges.push({ start, end: start + block.length });
    cursor = start + block.length;
  }
  return ranges;
}

function windowAround(text: string, target: Span, paragraphs: number): string {
  const ranges = paragraphRanges(text);
  const hit = ranges.findIndex((r) => r.start <= target.start && r.end >= target.end);
  const i = hit === -1 ? ranges.findIndex((r) => r.end >= target.start) : hit;
  if (i === -1) return target.text;
  const from = ranges[Math.max(0, i - paragraphs)];
  const to = ranges[Math.min(ranges.length - 1, i + paragraphs)];
  return text.slice(from.start, to.end);
}

const markers = (text: string, re: RegExp): Set<string> =>
  new Set((text.match(re) ?? []).map((m) => m.toLowerCase()));

interface Row {
  document: string;
  chars: number;
  targets: number;
  fullContextChars: number;
  windowContextChars: Record<string, number>;
  firstPersonLostByWindow: Record<string, number>;
  agentNounsLostByWindow: Record<string, number>;
}

function measure(document: string, text: string): Row {
  const diagnostic = analyze(text);
  const targets: Span[] = [];
  const seen = new Set<string>();
  for (const f of diagnostic.findings as readonly Finding[]) {
    const { span } = rewriteTargetAt(text, f.span.start);
    const key = `${span.start}:${span.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(span);
  }

  const docFirstPerson = markers(text, rewriteLocalePtBR.firstPersonMarkers);
  const docAgentNouns = markers(text, rewriteLocalePtBR.thirdPersonAgentNouns);

  const windowContextChars: Record<string, number> = {};
  const firstPersonLostByWindow: Record<string, number> = {};
  const agentNounsLostByWindow: Record<string, number> = {};

  for (const w of WINDOWS) {
    let chars = 0;
    let fpLost = 0;
    let agentLost = 0;
    for (const target of targets) {
      const context = windowAround(text, target, w);
      chars += context.length;

      if (docFirstPerson.size > 0 && markers(context, rewriteLocalePtBR.firstPersonMarkers).size === 0) fpLost++;

      const inWindow = markers(context, rewriteLocalePtBR.thirdPersonAgentNouns);
      if ([...docAgentNouns].some((n) => !inWindow.has(n))) agentLost++;
    }
    windowContextChars[`±${w}`] = chars;
    firstPersonLostByWindow[`±${w}`] = fpLost;
    agentNounsLostByWindow[`±${w}`] = agentLost;
  }

  return {
    document,
    chars: text.length,
    targets: targets.length,
    fullContextChars: targets.length * text.length,
    windowContextChars,
    firstPersonLostByWindow,
    agentNounsLostByWindow,
  };
}

describe("rewrite context — what is global and what a window would cost", () => {
  const files = fs.existsSync(CORPUS_DIR) ? fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".txt")) : [];

  it("finds the corpus", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("measures every corpus document and reports the global dependencies", () => {
    const rows = files.map((f) => measure(f, fs.readFileSync(path.join(CORPUS_DIR, f), "utf8")));

    const totals = {
      documents: rows.length,
      targets: rows.reduce((n, r) => n + r.targets, 0),
      fullContextChars: rows.reduce((n, r) => n + r.fullContextChars, 0),
      windowContextChars: Object.fromEntries(
        WINDOWS.map((w) => [`±${w}`, rows.reduce((n, r) => n + r.windowContextChars[`±${w}`], 0)]),
      ),
      firstPersonLost: Object.fromEntries(
        WINDOWS.map((w) => [`±${w}`, rows.reduce((n, r) => n + r.firstPersonLostByWindow[`±${w}`], 0)]),
      ),
      agentNounsLost: Object.fromEntries(
        WINDOWS.map((w) => [`±${w}`, rows.reduce((n, r) => n + r.agentNounsLostByWindow[`±${w}`], 0)]),
      ),
    };

    expect(totals.targets).toBeGreaterThan(0);

    if (EMIT) {
      fs.mkdirSync("eval", { recursive: true });
      fs.writeFileSync("eval/rewrite-context.json", `${JSON.stringify({ totals, rows }, null, 2)}\n`);
      console.log(JSON.stringify(totals, null, 2));
    }
  });
});
