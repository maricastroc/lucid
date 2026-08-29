import {
  analyze,
  buildDocument,
  buildStructuredDocument,
  ptDocumentServices,
  spliceStructuredDocument,
  toRawBlocks,
  type Document,
  type RawBlock,
} from "@/lucid";
import { applyProposal, totalBurden, verifyRewrite, type RewriteVerification } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { fidelityOf, styleOf, type FidelityReport, type StyleReport } from "./fidelity";
import type { RunRow } from "./runner";
import type { EvalTarget } from "./targets";

const SEVERITY_WEIGHT: Record<string, number> = { error: 3, warning: 1, info: 0.3 };

export type StructureOutcome =
  | { kind: "unchanged" }
  | { kind: "expanded"; blocks: string[]; listItems: number; docxSurvives: boolean | null }
  | { kind: "refused"; reason: string }
  | { kind: "not-checked"; reason: string };

export interface ScoredRow {
  readonly row: RunRow;
  readonly target: EvalTarget;
  readonly changed: boolean;
  readonly verification: RewriteVerification;
  readonly proofsPassed: number;
  readonly proofsTotal: number;
  readonly vetoed: boolean;
  readonly failedProofs: string[];
  readonly flaggedSignals: string[];
  readonly regionBurdenBefore: number;
  readonly regionBurdenAfter: number;
  readonly totalBurdenBefore: number;
  readonly totalBurdenAfter: number;
  readonly newCriteriaInRegion: string[];
  readonly newCriteriaInDocument: string[];
  readonly fidelity: FidelityReport;
  readonly style: StyleReport;
  readonly structure: StructureOutcome;
}

function burdenIn(
  findings: readonly { span: { start: number; end: number }; severity: string }[],
  start: number,
  end: number,
): number {
  return findings.reduce(
    (sum, f) => (f.span.start < end && f.span.end > start ? sum + (SEVERITY_WEIGHT[f.severity] ?? 0) : sum),
    0,
  );
}

const sentenceWords = (text: string): number[] => buildDocument(text).sentences.map((s) => s.wordCount);

function structuredOf(text: string): Document {
  return buildStructuredDocument(toRawBlocks(buildDocument(text).blocks), ptDocumentServices);
}

const kindsOf = (blocks: readonly RawBlock[]): string[] =>
  blocks.map((b) => (b.kind === "heading" ? `heading${b.level}` : b.kind));

async function docxSurvives(blocks: readonly RawBlock[]): Promise<boolean> {
  const { blocksToDocx } = await import("../../../src/exporters/docx");
  const { htmlToRawBlocks } = await import("../../../src/importers/html-blocks");
  const mammoth = (await import("mammoth")).default;
  const bytes = blocksToDocx(blocks);
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  return kindsOf(htmlToRawBlocks(html)).join("|") === kindsOf(blocks).join("|");
}

async function structureOutcome(target: EvalTarget, proposed: string): Promise<StructureOutcome> {
  if (proposed === target.span.text) return { kind: "unchanged" };

  const doc = structuredOf(target.text);
  const matches = doc.blocks.filter((b) => b.kind === "paragraph" && b.text === target.span.text);
  if (matches.length !== 1) {
    return { kind: "not-checked", reason: matches.length === 0 ? "paragrafo_nao_encontrado" : "paragrafo_ambiguo" };
  }
  const block = matches[0];
  const next = doc.source.slice(0, block.start) + proposed + doc.source.slice(block.end);
  const result = spliceStructuredDocument(doc, next, ptDocumentServices);
  if (!result.ok) return { kind: "refused", reason: result.reason };

  const before = kindsOf(toRawBlocks(doc.blocks));
  const raw = toRawBlocks(result.document.blocks);
  const after = kindsOf(raw);
  if (before.join("|") === after.join("|")) return { kind: "unchanged" };

  const grown = result.document.blocks.length - doc.blocks.length;
  const listItems = result.document.blocks.reduce((n, b) => n + (b.kind === "list" ? b.items.length : 0), 0);

  return {
    kind: "expanded",
    blocks: after,
    listItems,
    docxSurvives: grown === 0 ? null : await docxSurvives(raw),
  };
}

export async function scoreRow(row: RunRow, target: EvalTarget): Promise<ScoredRow> {
  const proposal = {
    proposerId: `${row.candidate}·${row.model}`,
    original: row.original,
    proposed: row.proposed,
    localeId: rewriteLocalePtBR.id,
    parseOutcome: row.parseOutcome,
  };

  const verification = await verifyRewrite(target.text, target.span, proposal, {
    locale: rewriteLocalePtBR,
    criterion: target.primaryCriterion,
    findings: target.findings,
  });

  const rewritten = applyProposal(target.text, target.span, proposal);
  const before = analyze(target.text);
  const after = analyze(rewritten);
  const newEnd = target.span.start + row.proposed.length;

  const beforeRegion = new Set(
    before.findings
      .filter((f) => f.span.start < target.span.end && f.span.end > target.span.start)
      .map((f) => f.criterion),
  );
  const afterRegion = after.findings.filter((f) => f.span.start < newEnd && f.span.end > target.span.start);
  const beforeDoc = new Set(before.findings.map((f) => f.criterion));

  const failedProofs = verification.proofs.filter((p) => !p.passed).map((p) => p.check);

  return {
    row,
    target,
    changed: row.proposed !== row.original,
    verification,
    proofsPassed: verification.proofs.filter((p) => p.passed).length,
    proofsTotal: verification.proofs.length,
    vetoed: verification.hasBlockingFailure,
    failedProofs,
    flaggedSignals: verification.signals.filter((s) => s.flagged).map((s) => s.check),
    regionBurdenBefore: burdenIn(before.findings, target.span.start, target.span.end),
    regionBurdenAfter: burdenIn(after.findings, target.span.start, newEnd),
    totalBurdenBefore: totalBurden(before.findings),
    totalBurdenAfter: totalBurden(after.findings),
    newCriteriaInRegion: [...new Set(afterRegion.map((f) => f.criterion))].filter((c) => !beforeRegion.has(c)).sort(),
    newCriteriaInDocument: [...new Set(after.findings.map((f) => f.criterion))].filter((c) => !beforeDoc.has(c)).sort(),
    fidelity: fidelityOf(row.original, row.proposed),
    style: styleOf(row.original, row.proposed, sentenceWords),
    structure: await structureOutcome(target, row.proposed),
  };
}
