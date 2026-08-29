import type { DocxNotes } from "@/importers/docx";
import type { PdfNotes } from "@/importers/pdf";
import type { BlockKind } from "@/lucid";
import {
  analyzeDocument,
  buildDocument,
  coverageReport,
  missingBlockKindsIn,
  sortFindings,
  type CriterionId,
  type Diagnostic,
  type Document,
  type Finding,
  type Severity,
} from "@/lucid";

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface AuditedFile {
  readonly name: string;
  readonly diagnostic: Diagnostic;
  readonly findings: readonly Finding[];
  readonly positions: readonly Position[];
  readonly counts: Record<Severity, number>;
  readonly silent: readonly string[];
  readonly missingBlockKinds: readonly BlockKind[];
  readonly importNotes: ImportNotes | null;
}

export type ImportNotes = ({ readonly format: "docx" } & DocxNotes) | ({ readonly format: "pdf" } & PdfNotes);

export const SEVERITY_ORDER: readonly Severity[] = ["info", "warning", "error"];

export function positionAt(text: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

export function auditText(name: string, text: string, criteria: readonly CriterionId[]): AuditedFile {
  return auditDocument(name, buildDocument(text), criteria);
}

export function auditDocument(
  name: string,
  doc: Document,
  criteria: readonly CriterionId[],
  importNotes: ImportNotes | null = null,
): AuditedFile {
  return finish(name, analyzeDocument(doc), criteria, doc, importNotes);
}

function finish(
  name: string,
  diagnostic: Diagnostic,
  criteria: readonly CriterionId[],
  doc: Document,
  importNotes: ImportNotes | null,
): AuditedFile {
  const selected =
    criteria.length === 0
      ? diagnostic.findings
      : diagnostic.findings.filter((f) => (criteria as readonly string[]).includes(f.criterion));
  const findings = sortFindings(selected);
  const counts: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const finding of findings) counts[finding.severity]++;
  const silent = coverageReport(doc).silentCriteria.filter(
    (criterion) => criteria.length === 0 || (criteria as readonly string[]).includes(criterion),
  );

  const missingBlockKinds: readonly BlockKind[] = silent.length === 0 ? [] : missingBlockKindsIn(doc.blocks);

  return {
    name,
    diagnostic,
    findings,
    positions: findings.map((f) => positionAt(diagnostic.text, f.span.start)),
    counts,
    silent,
    missingBlockKinds,
    importNotes,
  };
}

export function crossesThreshold(counts: Record<Severity, number>, failOn: Severity): boolean {
  const from = SEVERITY_ORDER.indexOf(failOn);
  return SEVERITY_ORDER.slice(from).some((severity) => counts[severity] > 0);
}
