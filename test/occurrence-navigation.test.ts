import { describe, expect, it } from "vitest";
import { analyze, checkBriefing, EMPTY_BRIEFING, type ReaderBriefing } from "../src/lucid";
import { segmentRange } from "../src/app/lib/editor-model";
import { occurrenceKey, resolveCursor, stepCursor } from "../src/app/lib/occurrence-cursor";

const TEXT =
  "O prazo para recorrer é de dez dias. Perdido o prazo, o pedido foi indeferido. " +
  "Quem perde o prazo pode apresentar novo pedido.";

const briefing = (mustFind: string[]): ReaderBriefing => ({ ...EMPTY_BRIEFING, mustFind });
const checkOf = (mustFind: string[]) => checkBriefing(TEXT, briefing(mustFind));

describe("occurrence cursor — pointing at text that keeps moving", () => {
  it("resolves to the span the author is standing on", () => {
    const check = checkOf(["prazo"]);
    const { spans, index, active } = resolveCursor(check, { expression: "prazo", index: 1 });

    expect(spans).toHaveLength(3);
    expect(index).toBe(1);
    expect(TEXT.slice(active!.start, active!.end)).toBe("prazo");
    expect(active).toBe(spans[1]);
  });

  it("clamps an index that outlived the occurrences it pointed at", () => {
    const { index, active } = resolveCursor(checkOf(["prazo"]), { expression: "prazo", index: 9 });
    expect(index).toBe(2);
    expect(active).not.toBeNull();
  });

  it("points at nothing when the expression is not in the text — never at a stale span", () => {
    const { spans, index, active } = resolveCursor(checkOf(["valor da multa"]), {
      expression: "valor da multa",
      index: 0,
    });
    expect(spans).toEqual([]);
    expect(index).toBe(-1);
    expect(active).toBeNull();
  });

  it("points at nothing when the expression was removed from the list", () => {
    expect(resolveCursor(checkOf([]), { expression: "prazo", index: 0 }).active).toBeNull();
    expect(resolveCursor(checkOf(["prazo"]), null).active).toBeNull();
  });

  it("steps within one expression and wraps at both ends", () => {
    expect(stepCursor({ expression: "prazo", index: 2 }, 3, 1).index).toBe(0);
    expect(stepCursor({ expression: "prazo", index: 0 }, 3, -1).index).toBe(2);
  });

  it("a single occurrence stays put in both directions instead of erroring", () => {
    expect(stepCursor({ expression: "dez dias", index: 0 }, 1, 1).index).toBe(0);
    expect(stepCursor({ expression: "dez dias", index: 0 }, 1, -1).index).toBe(0);
    expect(stepCursor({ expression: "gone", index: 0 }, 0, 1).index).toBe(0);
  });

  it("keys one occurrence apart from the others of the same expression", () => {
    const spans = checkOf(["prazo"]).coverage[0].occurrences;
    expect(new Set(spans.map(occurrenceKey)).size).toBe(spans.length);
  });
});

describe("occurrence marks in the document — the scroll targets the panel needs", () => {
  it("every occurrence becomes its own segment, carrying the span that identifies it", () => {
    const { findings } = analyze(TEXT);
    const spans = checkOf(["prazo"]).coverage[0].occurrences;
    const segments = segmentRange(TEXT, findings, 0, TEXT.length, spans);

    const marked = segments.filter((s) => s.mark !== undefined);
    expect(marked).toHaveLength(spans.length);
    for (const segment of marked) expect(segment.text).toBe("prazo");
  });

  it("marking an occurrence does not swallow the findings underneath it", () => {
    const { findings } = analyze(TEXT);
    const passive = findings.find((f) => f.criterion === "passive_voice");
    expect(passive).toBeDefined();

    const spans = checkOf(["prazo"]).coverage[0].occurrences;
    const withMarks = segmentRange(TEXT, findings, 0, TEXT.length, spans);
    const covering = withMarks.filter(
      (s) => s.start >= passive!.span.start && s.end <= passive!.span.end && s.inline !== undefined,
    );
    expect(covering.length).toBeGreaterThan(0);
  });

  it("with no expression selected the segmentation is exactly what it was before", () => {
    const { findings } = analyze(TEXT);
    expect(segmentRange(TEXT, findings, 0, TEXT.length, [])).toEqual(segmentRange(TEXT, findings, 0, TEXT.length));
  });
});
