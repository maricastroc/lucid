import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { ptAbbreviations } from "./support/pt";

const REPORT = process.env.MUTANT_REPORT ?? "";
const TARGET = "src/lucid/core/document/segment-sentences.ts";
const MUT_DIR = path.join(__dirname, ".mutants");

interface Mutant {
  id: string;
  mutatorName: string;
  status: string;
  replacement: string;
  location: { start: { line: number; column: number }; end: { line: number; column: number } };
}

function splice(source: string, m: Mutant): string {
  const lines = source.split("\n");
  const offsetOf = (line: number, col: number) =>
    lines.slice(0, line - 1).reduce((a, l) => a + l.length + 1, 0) + (col - 1);
  const start = offsetOf(m.location.start.line, m.location.start.column);
  const end = offsetOf(m.location.end.line, m.location.end.column);
  return source.slice(0, start) + m.replacement + source.slice(end);
}

function structuralCorpus(): string[] {
  const alphabet = [
    ".",
    "!",
    "?",
    "…",
    '"',
    "'",
    ")",
    "]",
    "”",
    "’",
    "»",
    "“",
    "«",
    "(",
    "[",
    " ",
    "\n",
    "\t",
    "A",
    "a",
    "1",
  ];
  const out: string[] = [];
  const build = (prefix: string, depth: number) => {
    if (depth === 0) return void out.push(prefix);
    for (const c of alphabet) build(prefix + c, depth - 1);
  };
  for (let len = 1; len <= 4; len++) build("", len);
  return out;
}

function lexicalCorpus(): string[] {
  const parts = [
    "art.",
    "km",
    "9h",
    "Sr.",
    "1",
    "500",
    "Silva",
    "casa",
    "A",
    "a",
    ".",
    " ",
    "\n\n",
    "\t",
    '"',
    "“",
    "(",
    "!",
    "?",
    "…",
  ];
  const out: string[] = [];
  const build = (prefix: string, depth: number) => {
    out.push(prefix);
    if (depth === 0) return;
    for (const p of parts) build(prefix + p, depth - 1);
  };
  build("", 4);
  return out;
}

function realCorpus(): string[] {
  const p = path.join(process.env.HOME ?? "", "Downloads", "real-corpus.json");
  if (!fs.existsSync(p)) return [];
  const docs = JSON.parse(fs.readFileSync(p, "utf8")) as { text: string }[];
  return docs.map((d) => d.text);
}

describe.runIf(REPORT)("mutant differential", () => {
  it("finds a distinguishing input for each survived mutant", async () => {
    const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
    const file = report.files[TARGET] ?? Object.values(report.files)[0];
    const source: string = file.source;
    const survived: Mutant[] = file.mutants.filter((m: Mutant) => m.status === "Survived" || m.status === "NoCoverage");

    const original = await import("../src/lucid/core/document/segment-sentences");
    const corpus = [...structuralCorpus(), ...lexicalCorpus(), ...realCorpus()];
    const baseline = corpus.map((t) => JSON.stringify(original.segmentSentences(t, ptAbbreviations)));

    fs.mkdirSync(MUT_DIR, { recursive: true });
    const rows: string[] = [];

    for (const m of survived) {
      const file_ = path.join(MUT_DIR, `m${m.id}.ts`);
      fs.writeFileSync(file_, splice(source, m));
      let diff: string | null = null;
      try {
        const mod = await import(/* @vite-ignore */ file_);
        for (let i = 0; i < corpus.length; i++) {
          let got: string;
          try {
            got = JSON.stringify(mod.segmentSentences(corpus[i], ptAbbreviations));
          } catch {
            got = "THROW";
          }
          if (got !== baseline[i]) {
            diff = corpus[i];
            break;
          }
        }
      } catch {
        diff = "COMPILE_ERROR";
      }
      rows.push(
        `${diff === null ? "EQUIV " : "GAP   "} ${m.location.start.line}:${m.location.start.column} ${m.mutatorName} → ${JSON.stringify(
          m.replacement,
        ).slice(0, 60)}${diff === null ? "" : "   ⟵ " + JSON.stringify(diff).slice(0, 70)}`,
      );
    }

    fs.rmSync(MUT_DIR, { recursive: true, force: true });
    rows.sort();
    process.stdout.write(
      `\n=== ${survived.length} sobreviventes · corpus ${corpus.length} entradas ===\n${rows.join("\n")}\n\n` +
        `GAP=${rows.filter((r) => r.startsWith("GAP")).length}  EQUIV=${rows.filter((r) => r.startsWith("EQUIV")).length}\n`,
    );
  }, 900_000);
});
