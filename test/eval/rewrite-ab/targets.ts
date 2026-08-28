import fs from "node:fs";
import path from "node:path";
import { analyze, buildDocument, type Finding, type Span } from "@/lucid";
import { rewriteTargetAt } from "../../../src/app/lib/paragraphs";

export const CORPUS_DIR = path.join(process.cwd(), "corpus/v1/text");

const MIN_CHARS = 150;
const MAX_CHARS = 700;

export interface EvalTarget {
  readonly id: string;
  readonly document: string;
  readonly span: Span;
  readonly text: string;
  readonly findings: readonly Finding[];
  readonly criteria: readonly string[];
  readonly primaryCriterion: string;
  readonly blockIndex: number;
}

function crossing(findings: readonly Finding[], span: Span): Finding[] {
  return findings.filter((f) => f.span.start < span.end && f.span.end > span.start);
}

function targetsIn(document: string, text: string): EvalTarget[] {
  const diagnostic = analyze(text);
  const doc = buildDocument(text);
  const out: EvalTarget[] = [];
  const seen = new Set<string>();

  for (const finding of diagnostic.findings) {
    const { span, unit } = rewriteTargetAt(text, finding.span.start);
    const key = `${span.start}:${span.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (unit !== "paragraph") continue;
    if (span.text.length < MIN_CHARS || span.text.length > MAX_CHARS) continue;

    const blockIndex = doc.blocks.findIndex(
      (b) => b.kind === "paragraph" && b.start === span.start && b.end === span.end,
    );
    if (blockIndex === -1) continue;

    const findings = crossing(diagnostic.findings, span);
    if (findings.length === 0) continue;

    out.push({
      id: `${document}#${span.start}-${span.end}`,
      document,
      span,
      text,
      findings,
      criteria: [...new Set(findings.map((f) => f.criterion))].sort(),
      primaryCriterion: findings[0].criterion,
      blockIndex,
    });
  }

  out.sort((a, b) => b.criteria.length - a.criteria.length || a.span.start - b.span.start);
  return out;
}

export function loadEvalTargets(limit: number): EvalTarget[] {
  const files = fs
    .readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith(".txt"))
    .sort();

  const byDocument = files.map((file) => targetsIn(file, fs.readFileSync(path.join(CORPUS_DIR, file), "utf8")));

  const picked: EvalTarget[] = [];
  for (let round = 0; picked.length < limit; round++) {
    let advanced = false;
    for (const list of byDocument) {
      if (round >= list.length) continue;
      advanced = true;
      picked.push(list[round]);
      if (picked.length === limit) return picked;
    }
    if (!advanced) break;
  }
  return picked;
}
