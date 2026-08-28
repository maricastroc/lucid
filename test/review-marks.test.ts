import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { findingId } from "../src/app/lib/criteria";
import {
  EMPTY_MARKS,
  parseStoredMarks,
  pruneMarks,
  reanchorMarks,
  reviewStateOf,
  tally,
  withMark,
  withMarks,
} from "../src/app/lib/review-marks";

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
    expect(reanchorMarks(marks, target, "abc")).toEqual({ [findingId(before)]: "seen" });
  });

  it("shifts marks after the edit by the exact length delta", () => {
    const after = finding("jargon", 200, 210);
    const marks = withMark(EMPTY_MARKS, after, "dismissed");

    expect(reanchorMarks(marks, target, "abc")).toEqual({ "jargon:193:203": "dismissed" });
  });

  it("shifts forward when the replacement is longer", () => {
    const after = finding("passive_voice", 200, 210);
    const marks = withMark(EMPTY_MARKS, after, "seen");
    expect(reanchorMarks(marks, target, "0123456789abcde")).toEqual({ "passive_voice:205:215": "seen" });
  });

  it("drops a mark whose text was inside the edit — a decision must not follow text nobody read", () => {
    const inside = finding("jargon", 102, 108);
    const straddling = finding("jargon", 95, 105);
    const marks = withMarks(EMPTY_MARKS, [inside, straddling], "seen");
    expect(reanchorMarks(marks, target, "abc")).toEqual({});
  });

  it("keeps a mark that ends exactly where the edit begins, and one that begins where it ends", () => {
    const touchingBefore = finding("jargon", 90, 100);
    const touchingAfter = finding("jargon", 110, 120);
    const marks = withMarks(EMPTY_MARKS, [touchingBefore, touchingAfter], "seen");
    expect(reanchorMarks(marks, target, "abc")).toEqual({
      "jargon:90:100": "seen",
      "jargon:103:113": "seen",
    });
  });

  it("keeps the criterion when the offsets move, even for ids containing separators", () => {
    const f = finding("sigla_sem_expansao", 200, 205);
    const marks = withMark(EMPTY_MARKS, f, "seen");
    expect(reanchorMarks(marks, target, "abc")).toEqual({ "sigla_sem_expansao:193:198": "seen" });
  });

  it("survives a sequence of edits without drifting", () => {
    const f = finding("jargon", 500, 510);
    let marks = withMark(EMPTY_MARKS, f, "seen");
    marks = reanchorMarks(marks, { start: 0, end: 10, text: "0123456789" }, "01234");
    marks = reanchorMarks(marks, { start: 20, end: 25, text: "01234" }, "0123456789");
    expect(marks).toEqual({ "jargon:500:510": "seen" });
  });
});

describe("review marks — free typing", () => {
  it("drops marks with no live occurrence instead of guessing a new home for them", () => {
    const live = finding("jargon", 10, 20);
    const stale = finding("jargon", 900, 910);
    const marks = withMarks(EMPTY_MARKS, [live, stale], "seen");
    expect(pruneMarks(marks, [live])).toEqual({ [findingId(live)]: "seen" });
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
    expect(parseStoredMarks({ "jargon:1:2": "seen", "passive_voice:3:4": "dismissed" })).toEqual({
      "jargon:1:2": "seen",
      "passive_voice:3:4": "dismissed",
    });
  });

  it("refuses unknown marks, malformed keys and non-objects", () => {
    expect(parseStoredMarks({ "jargon:1:2": "approved" })).toBeNull();
    expect(parseStoredMarks({ jargon: "seen" })).toBeNull();
    expect(parseStoredMarks({ "jargon:x:2": "seen" })).toBeNull();
    expect(parseStoredMarks([])).toBeNull();
    expect(parseStoredMarks("seen")).toBeNull();
  });
});
