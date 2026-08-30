import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { findingId } from "../src/app/lib/criteria";
import {
  EMPTY_MARKS,
  parseStoredMarks,
  pruneMarks,
  reanchorMarks,
  keptPoints,
  noteOf,
  reviewStateOf,
  tally,
  withMark,
  withMarks,
  withNote,
} from "../src/app/lib/review-marks";

const delta = (span: { start: number; end: number }, replacement: string): number =>
  replacement.length - (span.end - span.start);

function finding(criterion: string, start: number, end: number, text = "x"): Finding {
  return {
    criterion,
    category: "lexical",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.2" },
    span: { start, end, text },
    severity: "warning",
    requiresHuman: true,
    justification: "",
  } as Finding;
}

describe("review marks — the author's bookkeeping", () => {
  it("treats the absence of a mark as pending: nothing to store for the default state", () => {
    expect(reviewStateOf(EMPTY_MARKS, finding("jargon", 10, 20))).toBe("pending");
    expect(Object.keys(EMPTY_MARKS)).toHaveLength(0);
  });

  it("marks and unmarks a single occurrence", () => {
    const f = finding("jargon", 10, 20);
    const seen = withMark(EMPTY_MARKS, f, "seen");
    expect(reviewStateOf(seen, f)).toBe("seen");
    expect(reviewStateOf(withMark(seen, f, null), f)).toBe("pending");
  });

  it("returns the same object when nothing changes, so React can bail out of the render", () => {
    const f = finding("jargon", 10, 20);
    const seen = withMark(EMPTY_MARKS, f, "seen");
    expect(withMark(seen, f, "seen")).toBe(seen);
    expect(withMark(EMPTY_MARKS, f, null)).toBe(EMPTY_MARKS);
    expect(withMarks(seen, [], "seen")).toBe(seen);
    expect(withMarks(seen, [f], "seen")).toBe(seen);
  });

  it("counts pending, seen and dismissed against the occurrences actually present", () => {
    const items = [finding("jargon", 0, 5), finding("jargon", 10, 15), finding("jargon", 20, 25)];
    const marks = withMark(withMark(EMPTY_MARKS, items[0], "seen"), items[1], "dismissed");
    expect(tally(marks, items)).toEqual({ total: 3, pending: 1, seen: 1, dismissed: 1 });
  });

  it("ignores marks left over from occurrences that are no longer in the set", () => {
    const gone = finding("jargon", 900, 910);
    const marks = withMark(EMPTY_MARKS, gone, "seen");
    expect(tally(marks, [finding("jargon", 0, 5)])).toEqual({ total: 1, pending: 1, seen: 0, dismissed: 0 });
  });
});

describe("review marks — surviving an applied edit", () => {
  const target = { start: 100, end: 110, text: "0123456789" };

  it("leaves marks before the edit untouched", () => {
    const before = finding("jargon", 10, 20);
    const marks = withMark(EMPTY_MARKS, before, "seen");
    expect(reanchorMarks(marks, target, delta(target, "abc"))).toEqual({ [findingId(before)]: { kind: "seen" } });
  });

  it("shifts marks after the edit by the exact length delta", () => {
    const after = finding("jargon", 200, 210);
    const marks = withMark(EMPTY_MARKS, after, "dismissed");

    expect(reanchorMarks(marks, target, delta(target, "abc"))).toEqual({ "jargon:193:203": { kind: "dismissed" } });
  });

  it("shifts forward when the replacement is longer", () => {
    const after = finding("passive_voice", 200, 210);
    const marks = withMark(EMPTY_MARKS, after, "seen");
    expect(reanchorMarks(marks, target, delta(target, "0123456789abcde"))).toEqual({
      "passive_voice:205:215": { kind: "seen" },
    });
  });

  it("drops a mark whose text was inside the edit — a decision must not follow text nobody read", () => {
    const inside = finding("jargon", 102, 108);
    const straddling = finding("jargon", 95, 105);
    const marks = withMarks(EMPTY_MARKS, [inside, straddling], "seen");
    expect(reanchorMarks(marks, target, delta(target, "abc"))).toEqual({});
  });

  it("keeps a mark that ends exactly where the edit begins, and one that begins where it ends", () => {
    const touchingBefore = finding("jargon", 90, 100);
    const touchingAfter = finding("jargon", 110, 120);
    const marks = withMarks(EMPTY_MARKS, [touchingBefore, touchingAfter], "seen");
    expect(reanchorMarks(marks, target, delta(target, "abc"))).toEqual({
      "jargon:90:100": { kind: "seen" },
      "jargon:103:113": { kind: "seen" },
    });
  });

  it("keeps the criterion when the offsets move, even for ids containing separators", () => {
    const f = finding("sigla_sem_expansao", 200, 205);
    const marks = withMark(EMPTY_MARKS, f, "seen");
    expect(reanchorMarks(marks, target, delta(target, "abc"))).toEqual({
      "sigla_sem_expansao:193:198": { kind: "seen" },
    });
  });

  it("survives a sequence of edits without drifting", () => {
    const f = finding("jargon", 500, 510);
    let marks = withMark(EMPTY_MARKS, f, "seen");
    marks = reanchorMarks(marks, { start: 0, end: 10, text: "0123456789" }, -5);
    marks = reanchorMarks(marks, { start: 20, end: 25, text: "01234" }, 5);
    expect(marks).toEqual({ "jargon:500:510": { kind: "seen" } });
  });
});

describe("review marks — free typing", () => {
  it("drops marks with no live occurrence instead of guessing a new home for them", () => {
    const live = finding("jargon", 10, 20);
    const stale = finding("jargon", 900, 910);
    const marks = withMarks(EMPTY_MARKS, [live, stale], "seen");
    expect(pruneMarks(marks, [live])).toEqual({ [findingId(live)]: { kind: "seen" } });
  });

  it("returns the same object when every mark is still live", () => {
    const live = finding("jargon", 10, 20);
    const marks = withMark(EMPTY_MARKS, live, "seen");
    expect(pruneMarks(marks, [live])).toBe(marks);
  });
});

describe("review marks — reading what was stored", () => {
  it("accepts an absent field as an empty set (older saved workspaces)", () => {
    expect(parseStoredMarks(undefined)).toEqual({});
  });

  it("accepts a well-formed record", () => {
    expect(parseStoredMarks({ "jargon:1:2": { kind: "seen" }, "passive_voice:3:4": { kind: "dismissed" } })).toEqual({
      "jargon:1:2": { kind: "seen" },
      "passive_voice:3:4": { kind: "dismissed" },
    });
  });

  it("reads the bare kind written before reasons existed, so no mark is lost on upgrade", () => {
    expect(parseStoredMarks({ "jargon:1:2": "seen", "passive_voice:3:4": "dismissed" })).toEqual({
      "jargon:1:2": { kind: "seen" },
      "passive_voice:3:4": { kind: "dismissed" },
    });
  });

  it("reads a stored reason, and drops one that is only whitespace", () => {
    expect(parseStoredMarks({ "jargon:1:2": { kind: "dismissed", note: "termo do edital-padrão" } })).toEqual({
      "jargon:1:2": { kind: "dismissed", note: "termo do edital-padrão" },
    });
    expect(parseStoredMarks({ "jargon:1:2": { kind: "seen", note: "   " } })).toEqual({
      "jargon:1:2": { kind: "seen" },
    });
  });

  it("refuses unknown marks, malformed keys, bad reasons and non-objects", () => {
    expect(parseStoredMarks({ "jargon:1:2": "approved" })).toBeNull();
    expect(parseStoredMarks({ "jargon:1:2": { kind: "approved" } })).toBeNull();
    expect(parseStoredMarks({ "jargon:1:2": { kind: "seen", note: 3 } })).toBeNull();
    expect(parseStoredMarks({ jargon: "seen" })).toBeNull();
    expect(parseStoredMarks({ "jargon:x:2": "seen" })).toBeNull();
    expect(parseStoredMarks([])).toBeNull();
    expect(parseStoredMarks("seen")).toBeNull();
  });
});

describe("review marks — the reason the author wrote", () => {
  const f = finding("jargon", 10, 20, "em sede de");

  it("carries no reason until one is written", () => {
    expect(noteOf(withMark(EMPTY_MARKS, f, "dismissed"), f)).toBe("");
  });

  it("stores the reason as typed, so the caret never jumps mid-sentence", () => {
    const marks = withNote(withMark(EMPTY_MARKS, f, "dismissed"), f, "termo do edital ");
    expect(noteOf(marks, f)).toBe("termo do edital ");
  });

  it("refuses a reason on a point nobody marked — the act comes before the justification", () => {
    expect(withNote(EMPTY_MARKS, f, "porque sim")).toBe(EMPTY_MARKS);
    expect(noteOf(withNote(EMPTY_MARKS, f, "porque sim"), f)).toBe("");
  });

  it("keeps the reason when the author changes the act", () => {
    const marks = withNote(withMark(EMPTY_MARKS, f, "dismissed"), f, "termo do edital-padrão");
    expect(noteOf(withMark(marks, f, "seen"), f)).toBe("termo do edital-padrão");
  });

  it("drops the reason with the mark, so no orphan justification survives", () => {
    const marks = withNote(withMark(EMPTY_MARKS, f, "dismissed"), f, "termo do edital-padrão");
    expect(withMark(marks, f, null)).toEqual({});
  });

  it("clears the reason when it is emptied", () => {
    const marks = withNote(withMark(EMPTY_MARKS, f, "seen"), f, "um motivo");
    expect(withNote(marks, f, "   ")).toEqual({ [findingId(f)]: { kind: "seen" } });
  });

  it("returns the same object when the reason does not change", () => {
    const marks = withNote(withMark(EMPTY_MARKS, f, "seen"), f, "um motivo");
    expect(withNote(marks, f, "um motivo")).toBe(marks);
  });

  it("carries the reason across an applied edit, with the mark it belongs to", () => {
    const after = finding("jargon", 200, 210, "em sede de");
    const marks = withNote(withMark(EMPTY_MARKS, after, "dismissed"), after, "termo do edital-padrão");
    expect(reanchorMarks(marks, { start: 100, end: 110, text: "0123456789" }, -7)).toEqual({
      "jargon:193:203": { kind: "dismissed", note: "termo do edital-padrão" },
    });
  });
});

describe("review marks — what the author examined and kept", () => {
  const a = finding("jargon", 10, 20, "em sede de");
  const b = finding("passive_voice", 30, 40, "foi indeferido");
  const c = finding("jargon", 50, 60, "supracitadas");

  it("lists only marked points, with the reason when there is one", () => {
    const marks = withNote(withMarks(EMPTY_MARKS, [a, b], "seen"), a, "termo do edital");
    expect(keptPoints(marks, [a, b, c])).toEqual([
      { finding: a, kind: "seen", note: "termo do edital" },
      { finding: b, kind: "seen", note: null },
    ]);
  });

  it("is empty when nobody examined anything", () => {
    expect(keptPoints(EMPTY_MARKS, [a, b, c])).toEqual([]);
  });

  it("ignores marks whose occurrence left the text", () => {
    const marks = withMark(EMPTY_MARKS, finding("jargon", 900, 910), "seen");
    expect(keptPoints(marks, [a, b, c])).toEqual([]);
  });
});
