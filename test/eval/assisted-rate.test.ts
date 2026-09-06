import { describe, expect, it } from "vitest";
import { precisionState, recallState } from "../../src/app/lib/assisted-rate";
import { buildAssistedCorpus } from "./assisted-corpus";
import type { AssistedStratum } from "../../src/report/eval/contract";

const stratum = (over: Partial<AssistedStratum>): AssistedStratum => ({
  cases: 10,
  negatives: 5,
  tp: 0,
  fp: 0,
  fn: 0,
  precision: null,
  recall: null,
  precisionInterval: null,
  recallInterval: null,
  ...over,
});

describe("assisted band — rate state", () => {
  it("no denominator reads as absent, never as withheld", () => {
    const s = stratum({ tp: 0, fp: 0, fn: 0 });
    expect(precisionState(s, false).kind).toBe("absent");
    expect(recallState(s, false, false).kind).toBe("absent");
    expect(precisionState(s, true).kind).toBe("absent");
  });

  it("a denominator on a withheld criterion reads as withheld, never as absent", () => {
    const s = stratum({ tp: 3, fp: 2, fn: 1 });
    expect(precisionState(s, false).kind).toBe("withheld");
    expect(recallState(s, false, false).kind).toBe("withheld");
  });

  it("a promoted criterion surfaces the value", () => {
    const s = stratum({ tp: 3, fp: 1, fn: 1, precision: 0.75, recall: 0.75 });
    expect(precisionState(s, true)).toEqual({ kind: "value", value: 0.75 });
    expect(recallState(s, true, false)).toEqual({ kind: "value", value: 0.75 });
  });

  it("recall on the enriched stratum is unmeasurable, whatever the counts or the gate say", () => {
    for (const promoted of [true, false]) {
      expect(recallState(stratum({ tp: 5, fn: 5, recall: 0.5 }), promoted, true).kind).toBe("unmeasurable");
      expect(recallState(stratum({ tp: 0, fn: 0 }), promoted, true).kind).toBe("unmeasurable");
    }
  });

  it("precision on the enriched stratum stays legitimate — the cue does not invalidate it", () => {
    const s = stratum({ tp: 5, fp: 3, precision: 0.625 });
    expect(precisionState(s, true)).toEqual({ kind: "value", value: 0.625 });
    expect(precisionState(s, false).kind).toBe("withheld");
  });

  it("a promoted criterion whose rate is still null reads as withheld, not as a value", () => {
    const s = stratum({ tp: 2, fp: 1, precision: null });
    expect(precisionState(s, true).kind).toBe("withheld");
  });
});

describe("assisted band — the real corpus reads correctly today", () => {
  const band = buildAssistedCorpus()!;
  const of = (criterion: string) => band.criteria.find((c) => c.criterion === criterion)!;

  it("sigla_sem_expansao: precision withheld where it fired, recall absent where it had no chance", () => {
    const m = of("sigla_sem_expansao");
    expect(precisionState(m.strata.random, m.promoted).kind).toBe("withheld"); // tp 0 · fp 1
    expect(recallState(m.strata.random, m.promoted, false).kind).toBe("absent"); // tp 0 · fn 0
    expect(precisionState(m.strata.cued, m.promoted).kind).toBe("withheld"); // tp 5 · fp 3
  });

  it("prose_enumeration: silent on every random passage — absent, not withheld", () => {
    const m = of("prose_enumeration");
    expect(precisionState(m.strata.random, m.promoted).kind).toBe("absent");
    expect(recallState(m.strata.random, m.promoted, false).kind).toBe("absent");
  });

  it("perifrase_inflada: recall withheld where it missed, precision absent where it never fired", () => {
    const m = of("perifrase_inflada");
    expect(precisionState(m.strata.random, m.promoted).kind).toBe("absent"); // tp 0 · fp 0
    expect(recallState(m.strata.random, m.promoted, false).kind).toBe("withheld"); // fn 2
  });
});
