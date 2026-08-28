import { describe, expect, it } from "vitest";
import { analyze, checkBriefing, EMPTY_BRIEFING, type ReaderBriefing } from "../src/lucid";
import { REPORT_RECORD_FIELDS, REVIEW_FLOW_FIELDS } from "../src/app/lib/briefing-surfaces";
import { readerQuestions } from "../src/app/components/report-record-dialog";
import { COPY } from "../src/app/i18n/copy";

const TEXT = "O pedido foi indeferido. O prazo para recorrer é de dez dias.";

function producesVerification(field: keyof ReaderBriefing): boolean {
  const filled: ReaderBriefing =
    field === "mustFind"
      ? { ...EMPTY_BRIEFING, mustFind: ["prazo para recorrer"] }
      : { ...EMPTY_BRIEFING, [field]: "alguma coisa declarada" };
  return checkBriefing(TEXT, filled).coverage.length > 0;
}

describe("briefing surfaces — each field lives where its consumer is", () => {
  it("every field of the briefing is claimed by exactly one surface", () => {
    const surfaced = [...REVIEW_FLOW_FIELDS, ...REPORT_RECORD_FIELDS];
    expect(new Set(surfaced).size).toBe(surfaced.length);
    expect([...surfaced].sort()).toEqual(Object.keys(EMPTY_BRIEFING).sort());
  });

  it("the review flow holds exactly the fields the engine can verify", () => {
    for (const field of REVIEW_FLOW_FIELDS) expect(producesVerification(field)).toBe(true);
  });

  it("the report record holds exactly the fields the engine never verifies", () => {
    for (const field of REPORT_RECORD_FIELDS) expect(producesVerification(field)).toBe(false);
  });

  it("the record fields still reach their one real consumer — they were moved, not dropped", () => {
    const declared: ReaderBriefing = {
      audience: "aposentado que nunca leu um edital",
      purpose: "descobrir se pode recorrer",
      priorKnowledge: "nao conhece o vocabulario",
      mustFind: [],
    };
    expect(checkBriefing(TEXT, declared).declared).toBe(true);
    for (const field of REPORT_RECORD_FIELDS) expect(declared[field].length).toBeGreaterThan(0);
  });

  it("the dialog renders every record field, and only those", () => {
    expect(readerQuestions(COPY["pt-BR"]).map((q) => q.key)).toEqual([...REPORT_RECORD_FIELDS]);
  });

  it("every record field is labelled in both interface languages", () => {
    for (const lang of ["pt-BR", "en"] as const) {
      for (const q of readerQuestions(COPY[lang])) {
        expect(q.label.length).toBeGreaterThan(0);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.placeholder.length).toBeGreaterThan(0);
      }
    }
  });

  it("moving the fields changed no finding: the briefing was never an engine input", () => {
    expect(analyze(TEXT).findings.length).toBe(analyze(TEXT).findings.length);
    expect(checkBriefing(TEXT, EMPTY_BRIEFING).declared).toBe(false);
  });
});
