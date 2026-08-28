import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { START_HERE_MIN_FINDINGS, startHerePlan } from "../src/app/lib/start-here";
import { EMPTY_MARKS, withMark } from "../src/app/lib/review-marks";

function finding(criterion: string, start: number, text: string, over: Partial<Finding> = {}): Finding {
  return {
    criterion,
    category: "lexical",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.2" },
    span: { start, end: start + text.length, text },
    severity: "warning",
    requiresHuman: true,
    justification: "",
    ...over,
  } as Finding;
}

const swap = (start: number) =>
  finding("jargon", start, "supracitadas", { requiresHuman: false, suggestion: "citadas acima" });
const judgement = (criterion: string, start: number) => finding(criterion, start, "foi indeferido");

function many(n: number, make: (i: number) => Finding): Finding[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

describe("start here — the entry ramp for a big audit", () => {
  it("names the volume instead of hiding it: total and how many criteria it spans", () => {
    const all = [...many(8, (i) => swap(i * 20)), ...many(6, (i) => judgement("passive_voice", 300 + i * 20))];
    const plan = startHerePlan(all, EMPTY_MARKS, false);
    expect(plan?.total).toBe(14);
    expect(plan?.criteria).toBe(2);
  });

  it("splits the volume into the two moves it suggests: direct swaps, then everything else", () => {
    const all = [...many(8, (i) => swap(i * 20)), ...many(6, (i) => judgement("passive_voice", 300 + i * 20))];
    const plan = startHerePlan(all, EMPTY_MARKS, false);
    expect(plan?.safe).toBe(8);
    expect(plan?.human).toBe(6);
    expect((plan?.safe ?? 0) + (plan?.human ?? 0)).toBe(plan?.total);
  });

  it("offers the heaviest criterion as the one to walk — the biggest dent for one frame of mind", () => {
    const all = [
      ...many(4, (i) => judgement("passive_voice", i * 20)),
      ...many(9, (i) => judgement("long_sentence", 200 + i * 20)),
    ];
    expect(startHerePlan(all, EMPTY_MARKS, false)?.firstCriterion).toEqual({ criterion: "long_sentence", count: 9 });
  });

  it("breaks ties by the canonical criterion order, so the ramp never shuffles between renders", () => {
    const all = [
      ...many(6, (i) => judgement("long_sentence", i * 20)),
      ...many(6, (i) => judgement("passive_voice", 300 + i * 20)),
    ];
    const first = startHerePlan(all, EMPTY_MARKS, false)?.firstCriterion;
    const again = startHerePlan([...all].reverse(), EMPTY_MARKS, false)?.firstCriterion;
    expect(first).toEqual(again);
  });

  it("stays quiet on a short list — a readable list needs no ramp", () => {
    const short = many(START_HERE_MIN_FINDINGS - 1, (i) => swap(i * 20));
    expect(startHerePlan(short, EMPTY_MARKS, false)).toBeNull();
    const atThreshold = many(START_HERE_MIN_FINDINGS, (i) => swap(i * 20));
    expect(startHerePlan(atThreshold, EMPTY_MARKS, false)).not.toBeNull();
  });

  it("steps aside once a filter is on — the reader already chose a way in", () => {
    const all = many(20, (i) => swap(i * 20));
    expect(startHerePlan(all, EMPTY_MARKS, true)).toBeNull();
  });

  it("steps aside once the review has started — it is an INITIAL state, not permanent chrome", () => {
    const all = many(20, (i) => swap(i * 20));
    expect(startHerePlan(all, withMark(EMPTY_MARKS, all[0], "seen"), false)).toBeNull();
    expect(startHerePlan(all, withMark(EMPTY_MARKS, all[0], "dismissed"), false)).toBeNull();
  });

  it("omits the swap step when nothing has a curated equivalent — never a click into an empty list", () => {
    const all = many(20, (i) => judgement("passive_voice", i * 20));
    const plan = startHerePlan(all, EMPTY_MARKS, false);
    expect(plan?.safe).toBe(0);
    expect(plan?.firstCriterion).toEqual({ criterion: "passive_voice", count: 20 });
  });
});
