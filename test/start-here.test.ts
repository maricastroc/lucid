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
    expect(startHerePlan(all, EMPTY_MARKS, false)?.firstCriterion).toMatchObject({
      criterion: "long_sentence",
      count: 9,
    });
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

  it("stays while a filter is on, because walking a step IS a filter", () => {
    const all = many(20, (i) => swap(i * 20));
    expect(startHerePlan(all, EMPTY_MARKS, true)).not.toBeNull();
  });

  it("gives every criterion a step and a state, not only the heaviest three", () => {
    const all = [
      ...many(10, (i) => judgement("passive_voice", i * 20)),
      ...many(4, (i) => judgement("long_sentence", 400 + i * 30)),
      ...many(2, (i) => swap(700 + i * 20)),
    ];
    const walked = all
      .filter((f) => f.criterion === "long_sentence")
      .reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    const steps = startHerePlan(all, walked, false)!.steps;

    expect(steps).toHaveLength(3);
    expect(steps.find((s) => s.criterion === "long_sentence")).toMatchObject({
      state: "done",
      pending: 0,
      reviewed: 4,
    });
    expect(steps.find((s) => s.criterion === "passive_voice")).toMatchObject({
      state: "not-started",
      pending: 10,
      reviewed: 0,
    });
  });

  it("calls a step in progress once part of it has been reviewed", () => {
    const all = many(12, (i) => judgement("passive_voice", i * 20));
    const steps = startHerePlan(all, withMark(EMPTY_MARKS, all[0], "dismissed"), false)!.steps;
    expect(steps[0]).toMatchObject({ state: "in-progress", pending: 11, reviewed: 1 });
  });

  it("stays through the review and counts what is already behind the reader", () => {
    const all = many(20, (i) => swap(i * 20));
    const started = startHerePlan(all, withMark(EMPTY_MARKS, all[0], "seen"), false);
    expect(started).not.toBeNull();
    expect(started!.progress).toMatchObject({ total: 20, seen: 1, dismissed: 0, pending: 19 });

    const ignored = startHerePlan(all, withMark(EMPTY_MARKS, all[0], "dismissed"), false);
    expect(ignored!.progress).toMatchObject({ seen: 0, dismissed: 1, pending: 19 });
  });

  it("does not count a dismissed point as a resolved one", () => {
    const all = many(20, (i) => swap(i * 20));
    const plan = startHerePlan(all, withMark(EMPTY_MARKS, all[0], "dismissed"), false, all)!;
    expect(plan.progress.dismissed).toBe(1);
    expect(plan.progress.resolved).toBe(0);
  });

  it("counts as resolved only what the text no longer carries", () => {
    const all = many(20, (i) => swap(i * 20));
    const plan = startHerePlan(all.slice(0, 18), EMPTY_MARKS, false, all)!;
    expect(plan.progress.resolved).toBe(2);
    expect(plan.progress.introduced).toBe(0);
  });

  it("counts what the revision introduced, without netting it against what it resolved", () => {
    const before = many(20, (i) => judgement("passive_voice", i * 20));
    const after = [...before, ...many(3, (i) => judgement("long_sentence", 500 + i * 20))];
    const plan = startHerePlan(after, EMPTY_MARKS, false, before)!;
    expect(plan.progress).toMatchObject({ resolved: 0, introduced: 3 });
  });

  it("ranks by the weight the audit already uses, not by raw count", () => {
    const all = [
      ...many(9, (i) => judgement("nominalizacao_encadeada", i * 20)),
      ...many(4, (i) => finding("long_sentence", 400 + i * 30, "uma frase longa", { severity: "error" })),
    ];
    const plan = startHerePlan(
      all.map((f) => (f.criterion === "nominalizacao_encadeada" ? { ...f, severity: "info" as const } : f)),
      EMPTY_MARKS,
      false,
    )!;
    expect(plan.firstCriterion).toMatchObject({ criterion: "long_sentence", count: 4, weight: 12 });
    expect(plan.heaviest.map((s) => s.criterion)).toEqual(["long_sentence", "nominalizacao_encadeada"]);
  });

  it("stops offering a criterion the reader has already been through", () => {
    const all = many(20, (i) => judgement("passive_voice", i * 20));
    const done = all.reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    expect(startHerePlan(all, done, false)!.heaviest).toEqual([]);
  });

  it("omits the swap step when nothing has a curated equivalent — never a click into an empty list", () => {
    const all = many(20, (i) => judgement("passive_voice", i * 20));
    const plan = startHerePlan(all, EMPTY_MARKS, false);
    expect(plan?.safe).toBe(0);
    expect(plan?.firstCriterion).toMatchObject({ criterion: "passive_voice", count: 20 });
  });
});
