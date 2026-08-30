import { describe, expect, it } from "vitest";
import type { Finding } from "../src/lucid";
import { planSteps, reviewRoute, routeStarted } from "../src/app/lib/review-route";
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

describe("review route — one model behind every progress figure", () => {
  it("names the volume instead of hiding it: total points and how many steps they span", () => {
    const all = [...many(8, (i) => swap(i * 20)), ...many(6, (i) => judgement("passive_voice", 300 + i * 20))];
    const route = reviewRoute(all, EMPTY_MARKS);
    expect(route.found).toBe(14);
    expect(route.steps).toHaveLength(2);
  });

  it("exists for a short document too — the path is the shape of the product, not a big-audit mode", () => {
    expect(
      reviewRoute(
        many(2, (i) => swap(i * 20)),
        EMPTY_MARKS,
      ).steps,
    ).toHaveLength(1);
  });

  it("has no steps and no entry when nothing fired", () => {
    const route = reviewRoute([], EMPTY_MARKS);
    expect(route.steps).toEqual([]);
    expect(route.entry).toBeNull();
    expect(route.allDone).toBe(false);
  });

  it("counts the open swaps separately, because they are the cheapest move on the list", () => {
    const all = [...many(8, (i) => swap(i * 20)), ...many(6, (i) => judgement("passive_voice", 300 + i * 20))];
    const route = reviewRoute(all, EMPTY_MARKS);
    expect(route.openSwaps).toBe(8);
  });

  it("stops counting a swap as open once the reader has been through it", () => {
    const all = many(4, (i) => swap(i * 20));
    expect(reviewRoute(all, withMark(EMPTY_MARKS, all[0], "seen")).openSwaps).toBe(3);
  });

  it("enters at the heaviest criterion — the biggest dent for one frame of mind", () => {
    const all = [
      ...many(4, (i) => judgement("passive_voice", i * 20)),
      ...many(9, (i) => judgement("long_sentence", 200 + i * 20)),
    ];
    expect(reviewRoute(all, EMPTY_MARKS).entry?.step).toMatchObject({ criterion: "long_sentence", count: 9 });
  });

  it("ranks by the weight the audit already uses, not by raw count", () => {
    const all = [
      ...many(9, (i) => finding("nominalizacao_encadeada", i * 20, "foi indeferido", { severity: "info" })),
      ...many(4, (i) => finding("long_sentence", 400 + i * 30, "uma frase longa", { severity: "error" })),
    ];
    const route = reviewRoute(all, EMPTY_MARKS);
    expect(route.entry?.step).toMatchObject({ criterion: "long_sentence", count: 4, weight: 12 });
    expect(route.steps.map((s) => s.criterion)).toEqual(["long_sentence", "nominalizacao_encadeada"]);
  });

  it("breaks ties by the canonical criterion order, so the path never shuffles between renders", () => {
    const all = [
      ...many(6, (i) => judgement("long_sentence", i * 20)),
      ...many(6, (i) => judgement("passive_voice", 300 + i * 20)),
    ];
    expect(reviewRoute(all, EMPTY_MARKS).entry).toEqual(reviewRoute([...all].reverse(), EMPTY_MARKS).entry);
  });

  it("gives every criterion a step and a state, not only the heaviest ones", () => {
    const all = [
      ...many(10, (i) => judgement("passive_voice", i * 20)),
      ...many(4, (i) => judgement("long_sentence", 400 + i * 30)),
      ...many(2, (i) => swap(700 + i * 20)),
    ];
    const walked = all
      .filter((f) => f.criterion === "long_sentence")
      .reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    const steps = planSteps(all, walked);

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

  it("calls a step in progress once part of it has been walked", () => {
    const all = many(12, (i) => judgement("passive_voice", i * 20));
    const steps = planSteps(all, withMark(EMPTY_MARKS, all[0], "dismissed"));
    expect(steps[0]).toMatchObject({ state: "in-progress", pending: 11, dismissed: 1, reviewed: 0 });
  });

  it("keeps reviewed and dismissed apart at both scales, so neither figure has to be interpreted", () => {
    const all = many(20, (i) => swap(i * 20));
    const seen = reviewRoute(all, withMark(EMPTY_MARKS, all[0], "seen"));
    expect(seen).toMatchObject({ found: 20, reviewed: 1, dismissed: 0, pending: 19 });

    const ignored = reviewRoute(all, withMark(EMPTY_MARKS, all[0], "dismissed"));
    expect(ignored).toMatchObject({ found: 20, reviewed: 0, dismissed: 1, pending: 19 });
  });

  it("never counts a dismissed point as a resolved one", () => {
    const all = many(20, (i) => swap(i * 20));
    const route = reviewRoute(all, withMark(EMPTY_MARKS, all[0], "dismissed"), null, all);
    expect(route.dismissed).toBe(1);
    expect(route.resolved).toBe(0);
  });

  it("counts as resolved only what the text no longer carries", () => {
    const all = many(20, (i) => swap(i * 20));
    const route = reviewRoute(all.slice(0, 18), EMPTY_MARKS, null, all);
    expect(route.resolved).toBe(2);
    expect(route.introduced).toBe(0);
  });

  it("counts what the revision introduced, without netting it against what it resolved", () => {
    const before = many(20, (i) => judgement("passive_voice", i * 20));
    const after = [...before, ...many(3, (i) => judgement("long_sentence", 500 + i * 20))];
    expect(reviewRoute(after, EMPTY_MARKS, null, before)).toMatchObject({ resolved: 0, introduced: 3 });
  });
});

describe("review route — where the reader stands", () => {
  const all = [
    ...many(4, (i) => finding("long_sentence", i * 40, "uma frase longa", { severity: "error" })),
    ...many(3, (i) => judgement("passive_voice", 400 + i * 20)),
    ...many(2, (i) => swap(700 + i * 20)),
  ];

  it("reports no open step until one is asked for", () => {
    const route = reviewRoute(all, EMPTY_MARKS);
    expect(route.open).toBeNull();
    expect(route.next).toBeNull();
  });

  it("knows which step is open, where it sits, and what comes after it", () => {
    const route = reviewRoute(all, EMPTY_MARKS, "long_sentence");
    expect(route.open).toMatchObject({ index: 0 });
    expect(route.open?.step.criterion).toBe("long_sentence");
    expect(route.next?.step.criterion).toBe("passive_voice");
  });

  it("wraps past the end so no pending step is left stranded behind the reader", () => {
    const last = reviewRoute(all, EMPTY_MARKS).steps.at(-1)!.criterion;
    expect(reviewRoute(all, EMPTY_MARKS, last).next?.index).toBe(0);
  });

  it("skips a finished step when offering the next one", () => {
    const walked = all
      .filter((f) => f.criterion === "passive_voice")
      .reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    expect(reviewRoute(all, walked, "long_sentence").next?.step.criterion).not.toBe("passive_voice");
  });

  it("offers no next step once every other one is done", () => {
    const walked = all
      .filter((f) => f.criterion !== "long_sentence")
      .reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    expect(reviewRoute(all, walked, "long_sentence").next).toBeNull();
  });

  it("ignores a stored step whose criterion the text no longer has", () => {
    expect(reviewRoute(all, EMPTY_MARKS, "mesoclise").open).toBeNull();
  });

  it("still offers an entry when everything is walked, so the path stays reachable", () => {
    const done = all.reduce((marks, f) => withMark(marks, f, "seen"), EMPTY_MARKS);
    const route = reviewRoute(all, done);
    expect(route.allDone).toBe(true);
    expect(route.stepsDone).toBe(route.steps.length);
    expect(route.entry).not.toBeNull();
  });

  it("tells a fresh path from one already under way", () => {
    expect(routeStarted(reviewRoute(all, EMPTY_MARKS))).toBe(false);
    expect(routeStarted(reviewRoute(all, withMark(EMPTY_MARKS, all[0], "dismissed")))).toBe(true);
  });
});
