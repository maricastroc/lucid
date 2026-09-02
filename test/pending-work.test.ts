import { describe, expect, it } from "vitest";
import { analyze, EMPTY_BRIEFING, type ReaderBriefing } from "../src/lucid";
import { copyFor } from "../src/app/i18n/copy";
import { atRiskItems, briefingAnswered, pendingWork, type PendingWorkInput } from "../src/app/lib/pending-work";
import { EMPTY_MARKS, withMark, withNote } from "../src/app/lib/review-marks";
import type { LedgerEntry } from "../src/app/lib/ledger";

const TEXT =
  "Foi realizada a análise do requerimento pela comissão competente, e a decisão foi comunicada ao " +
  "interessado no processo administrativo.";

const entry = (): LedgerEntry => ({
  source: "manual",
  label: "Manual",
  before: "Foi realizada a análise",
  after: "A comissão analisou",
  burdenBefore: 4,
  burdenAfter: 2,
});

function input(over: Partial<PendingWorkInput> = {}): PendingWorkInput {
  return {
    text: TEXT,
    originalText: TEXT,
    ledger: [],
    marks: EMPTY_MARKS,
    briefing: EMPTY_BRIEFING,
    ...over,
  };
}

describe("what is at risk when the open document is replaced", () => {
  it("finds nothing at risk in a document that was opened and only read", () => {
    expect(pendingWork(input())).toBeNull();
  });

  it("stays silent for the empty workspace, so the first document never asks for permission", () => {
    expect(pendingWork(input({ text: "", originalText: "" }))).toBeNull();
    expect(pendingWork(input({ text: "   \n  ", originalText: "" }))).toBeNull();
  });

  it("counts the recorded changes, which live nowhere else", () => {
    const work = pendingWork(input({ ledger: [entry(), entry()] }));
    expect(work?.changes).toBe(2);
  });

  it("separates what the author reviewed from what the author dismissed", () => {
    const findings = analyze(TEXT).findings;
    let marks = withMark(EMPTY_MARKS, findings[0], "seen");
    marks = withMark(marks, findings[1], "dismissed");

    const work = pendingWork(input({ marks }));
    expect(work?.reviewed).toBe(1);
    expect(work?.dismissed).toBe(1);
  });

  it("treats a written reason as work, because no re-analysis brings it back", () => {
    const finding = analyze(TEXT).findings[0];
    const marks = withNote(withMark(EMPTY_MARKS, finding, "dismissed"), finding, "Termo exigido pelo edital-padrão.");

    expect(pendingWork(input({ marks }))?.dismissed).toBe(1);
  });

  it("sees typing that the trail has not recorded yet", () => {
    const work = pendingWork(input({ text: `${TEXT} Novo parágrafo em digitação.`, ledger: [] }));
    expect(work?.editedText).toBe(true);
    expect(work?.changes).toBe(0);
  });

  it("does not call an untouched import edited", () => {
    expect(pendingWork(input({ text: TEXT, originalText: TEXT }))).toBeNull();
  });

  it("warns when the entry text was never recorded, because not knowing is not the same as nothing", () => {
    expect(pendingWork(input({ originalText: null }))?.editedText).toBe(true);
  });

  it("counts the answered briefing, which is the author's elicitation and not a measurement", () => {
    const briefing: ReaderBriefing = { ...EMPTY_BRIEFING, audience: "Servidores da ponta" };
    expect(pendingWork(input({ briefing }))?.briefing).toBe(true);
  });

  it("ignores a briefing filled with blanks", () => {
    const briefing: ReaderBriefing = { audience: "  ", purpose: "", priorKnowledge: "\n", mustFind: ["  "] };
    expect(briefingAnswered(briefing)).toBe(false);
    expect(pendingWork(input({ briefing }))).toBeNull();
  });

  it("does not treat the audit itself as work at risk — it is recomputed from the text", () => {
    expect(analyze(TEXT).findings.length).toBeGreaterThan(0);
    expect(pendingWork(input())).toBeNull();
  });
});

describe("naming what is at risk", () => {
  const pt = copyFor("pt-BR").studio.replaceDocument;
  const en = copyFor("en").studio.replaceDocument;

  it("never shows a number without the noun it counts", () => {
    const work = pendingWork(input({ ledger: [entry()] }))!;
    const items = atRiskItems(work, pt);

    expect(items).toContain("1 alteração registrada");
    for (const item of items) expect(item).not.toMatch(/^\d+$/);
  });

  it("agrees in number, in both languages", () => {
    expect(pt.changes(1)).toBe("1 alteração registrada");
    expect(pt.changes(3)).toBe("3 alterações registradas");
    expect(pt.reviewed(1)).toBe("1 ponto revisado");
    expect(pt.dismissed(2)).toBe("2 pontos ignorados");
    expect(en.changes(1)).toBe("1 recorded change");
    expect(en.changes(3)).toBe("3 recorded changes");
  });

  it("lists only what is actually at risk", () => {
    const findings = analyze(TEXT).findings;
    const work = pendingWork(
      input({
        ledger: [entry()],
        marks: withMark(EMPTY_MARKS, findings[0], "seen"),
      }),
    )!;

    const items = atRiskItems(work, pt);
    expect(items).toEqual(["1 alteração registrada", "1 ponto revisado"]);
    expect(items).not.toContain(pt.briefing);
    expect(items).not.toContain(pt.editedText);
  });

  it("puts the text and the decisions before the briefing", () => {
    const findings = analyze(TEXT).findings;
    const work = pendingWork(
      input({
        text: `${TEXT} Mais uma frase.`,
        ledger: [entry()],
        marks: withMark(EMPTY_MARKS, findings[0], "dismissed"),
        briefing: { ...EMPTY_BRIEFING, purpose: "Explicar o prazo de recurso" },
      }),
    )!;

    expect(atRiskItems(work, pt)).toEqual([
      pt.editedText,
      "1 alteração registrada",
      "1 ponto ignorado",
      pt.briefing,
    ]);
  });
});
