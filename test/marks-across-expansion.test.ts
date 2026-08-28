import { describe, expect, it } from "vitest";
import {
  analyzeDocument,
  buildStructuredDocument,
  ptDocumentServices,
  spliceStructuredDocument,
  type Document,
  type Finding,
  type RawBlock,
  type Span,
} from "@/lucid";
import { findingId } from "../src/app/lib/criteria";
import { pruneMarks, reanchorMarks, type ReviewMarks } from "../src/app/lib/review-marks";

const HEAD_PARA =
  "A publicação do presente instrumento convocatório foi determinada pela autoridade competente, " +
  "consoante deliberação exarada nos autos do procedimento administrativo correspondente.";

const PREAMBLE =
  "A Secretária torna público o edital com fundamento na Lei Federal nº 13.019/2014, na Lei Complementar " +
  "nº 119/2012, alterada pela Lei Complementar nº 178/2018, e no Decreto Estadual nº 32.810/2018.";

const TAIL_PARA =
  "Constitui o objeto deste edital o chamamento de organizações da sociedade civil interessadas na " +
  "celebração de termo de colaboração, cuja formalização será efetivada pela Administração Pública.";

const BLOCKS: readonly RawBlock[] = [
  { kind: "heading", level: 1, text: "Edital de chamamento público" },
  { kind: "paragraph", text: HEAD_PARA },
  { kind: "paragraph", text: PREAMBLE },
  { kind: "heading", level: 2, text: "Do objeto" },
  { kind: "paragraph", text: TAIL_PARA },
  { kind: "list", ordered: false, items: ["Certidão do e-Parcerias", "Plano de trabalho assinado"] },
];

const AS_LIST =
  "A Secretária torna público o edital, com base nestas normas:\n" +
  "- Lei Federal nº 13.019/2014.\n" +
  "- Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.\n" +
  "- Decreto Estadual nº 32.810/2018.";

const AS_ONE_LINE =
  "A Secretária torna público o edital. Ele tem base na Lei Federal nº 13.019/2014, na Lei Complementar " +
  "nº 119/2012, alterada pela Lei Complementar nº 178/2018, e no Decreto Estadual nº 32.810/2018.";

interface Applied {
  readonly before: readonly Finding[];
  readonly inside: readonly Finding[];
  readonly after: readonly Finding[];
  readonly all: readonly Finding[];
  readonly survivors: ReviewMarks;
  readonly afterUndo: ReviewMarks;
}

function applyWithMarks(replacement: string): Applied {
  const doc: Document = buildStructuredDocument(BLOCKS, ptDocumentServices);
  const findings = analyzeDocument(doc).findings;
  const block = doc.blocks[2];
  const target: Span = { start: block.start, end: block.end, text: block.text };

  const marks: ReviewMarks = Object.fromEntries(findings.map((f) => [findingId(f), "seen" as const]));
  const shifted = reanchorMarks(marks, target, replacement);

  const next = doc.source.slice(0, target.start) + replacement + doc.source.slice(target.end);
  const result = spliceStructuredDocument(doc, next, ptDocumentServices);
  if (!result.ok) throw new Error(`splice recusado: ${result.reason}`);

  return {
    before: findings.filter((f) => f.span.end <= target.start),
    inside: findings.filter((f) => f.span.start < target.end && f.span.end > target.start),
    after: findings.filter((f) => f.span.start >= target.end),
    all: findings,
    survivors: pruneMarks(shifted, analyzeDocument(result.document).findings),
    afterUndo: pruneMarks(shifted, findings),
  };
}

const count = (marks: ReviewMarks): number => Object.keys(marks).length;

describe("review marks across an applied rewrite", () => {
  it("the fixture really has marks on all three sides of the target", () => {
    const applied = applyWithMarks(AS_ONE_LINE);
    expect(applied.before.length).toBeGreaterThan(0);
    expect(applied.inside.length).toBeGreaterThan(0);
    expect(applied.after.length).toBeGreaterThan(0);
  });

  it("a single-line rewrite costs only the marks inside the edited excerpt", () => {
    const applied = applyWithMarks(AS_ONE_LINE);
    expect(count(applied.survivors)).toBe(applied.all.length - applied.inside.length);
    for (const finding of applied.before) expect(applied.survivors[findingId(finding)]).toBe("seen");
  });

  it("a structural expansion costs every mark from the edit to the end of the document", () => {
    const applied = applyWithMarks(AS_LIST);

    for (const finding of applied.before) expect(applied.survivors[findingId(finding)]).toBe("seen");

    expect(count(applied.survivors)).toBe(applied.before.length);
    expect(applied.after.length).toBeGreaterThan(0);
  });

  it("undo brings the text back but never the marks", () => {
    for (const replacement of [AS_ONE_LINE, AS_LIST]) {
      const applied = applyWithMarks(replacement);
      expect(count(applied.afterUndo)).toBe(applied.before.length);
      expect(count(applied.afterUndo)).toBeLessThan(applied.all.length);
    }
  });
});
