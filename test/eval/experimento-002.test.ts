import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildAssistedCorpus } from "./assisted-corpus";
import { precisionState, recallState, silentStratumReading } from "../../src/app/lib/assisted-rate";

const REPO_ROOT = resolve(__dirname, "../..");
const band = buildAssistedCorpus()!;
const of = (criterion: string) => band.criteria.find((c) => c.criterion === criterion)!;

const queueSize = (criterion: string): number => {
  const path = resolve(REPO_ROOT, "corpus/v1/review", `${criterion}.queue.jsonl`);
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
};

describe("experimento 002 — the published numbers still hold", () => {
  it("§3.2 — three criteria measured, one promoted, two withheld", () => {
    expect(band.criteria.length).toBe(3);
    expect(band.measuredAssisted).toEqual(["prose_enumeration"]);
    expect(band.withheld).toEqual(["sigla_sem_expansao", "perifrase_inflada"]);
  });

  it("§3 — the agreement table", () => {
    const table = band.criteria.map((c) => ({
      criterion: c.criterion,
      ac1: c.agreement.gwetAc1,
      kappa: c.agreement.cohenKappa,
      pairs: c.agreement.n,
    }));

    expect(table).toEqual([
      { criterion: "sigla_sem_expansao", ac1: 0.5577, kappa: 0.4636, pairs: 36 },
      { criterion: "prose_enumeration", ac1: 1, kappa: null, pairs: 16 },
      { criterion: "perifrase_inflada", ac1: 0.3207, kappa: 0.3138, pairs: 82 },
    ]);
  });

  it("§2 — the floor the table is judged against is 0.7 for every criterion", () => {
    for (const c of band.criteria) expect(c.agreementFloor, c.criterion).toBe(0.7);
  });

  it("§3.1/§6.4 — 65 items were queued; the one that was reviewed left, 64 remain", () => {
    expect(queueSize("perifrase_inflada")).toBe(49);
    expect(queueSize("sigla_sem_expansao")).toBe(15);
    expect(queueSize("prose_enumeration")).toBe(0);
    expect(queueSize("perifrase_inflada") + queueSize("sigla_sem_expansao")).toBe(64);
  });

  it("§3.2 — the reviewed item is recorded as human, blind, and from the audit route", () => {
    const path = resolve(REPO_ROOT, "corpus/v1/review/prose_enumeration.jsonl");
    const rows = readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as Record<string, unknown>);

    expect(rows).toHaveLength(1);
    expect(rows[0].passageId).toBe("planalto-leis__1989-1994-l7994#0002");
    expect(rows[0].route).toBe("human_audit_sample");
    expect(rows[0].blind).toBe(true);
    expect(rows[0].count).toBe(0);
    expect(rows[0].reviewedBy).toBeTruthy();
  });

  it("§3.2/§4.1 — prose_enumeration cleared the last gate and is promoted", () => {
    const m = of("prose_enumeration");
    expect(m.promoted).toBe(true);
    expect(m.withheldReason).toBeNull();
    expect(m.agreement.gwetAc1! >= m.agreementFloor).toBe(true);
    expect(m.composition.human).toBe(1);
  });

  it("§3.2/§6.3 — the consensus audit has n = 1 and found no disagreement", () => {
    const audit = of("prose_enumeration").consensusAudit;
    expect(audit.n).toBe(1);
    expect(audit.disagreements).toBe(0);
    expect(audit.errorRate).toBe(0);
  });

  it("§4.1 — the other two are below the floor, which no amount of reviewing moves", () => {
    for (const criterion of ["sigla_sem_expansao", "perifrase_inflada"]) {
      const m = of(criterion);
      expect(m.agreement.gwetAc1! < m.agreementFloor, criterion).toBe(true);
      expect(m.withheldReason, criterion).toBe("AC1 abaixo do piso de 0,7");
    }
  });

  it("§4.1 — only prose_enumeration has a human-adjudicated label; the other two are untouched", () => {
    expect(of("prose_enumeration").composition.human).toBe(1);
    expect(of("sigla_sem_expansao").composition.human).toBe(0);
    expect(of("perifrase_inflada").composition.human).toBe(0);
  });

  it("§4.2 — what the promoted criterion publishes is an absence: 16 passages, zero false positives", () => {
    const m = of("prose_enumeration");
    const random = m.strata.random;
    expect(random.cases).toBe(16);
    expect(random.negatives).toBe(16);
    expect([random.tp, random.fp, random.fn]).toEqual([0, 0, 0]);
    expect(precisionState(random, m.promoted).kind).toBe("absent");
    expect(recallState(random, m.promoted, false).kind).toBe("absent");
    expect(silentStratumReading(random)).toEqual({ cases: 16 });
  });

  it("§5 — the prediction missed by one: the audited passage joined the stratum it was drawn from", () => {
    expect(of("prose_enumeration").strata.random.cases).toBe(
      of("prose_enumeration").composition.consensus + of("prose_enumeration").composition.human,
    );
  });

  it("§6.5 — the random strata are small: 9, 16 and 6 cases", () => {
    expect(of("sigla_sem_expansao").strata.random.cases).toBe(9);
    expect(of("prose_enumeration").strata.random.cases).toBe(16);
    expect(of("perifrase_inflada").strata.random.cases).toBe(6);
  });

  it("§2 — the corpus behind it: 149 passages from 16 federal acts", () => {
    expect(band.passages).toBe(149);
    expect(band.documents).toBe(16);
  });

  it("§4.1 — the two labellers named in the text", () => {
    expect([...new Set(band.labelers.map((l) => l.model))].sort()).toEqual(["gemini-2.5-flash", "openai/gpt-oss-120b"]);
    for (const l of band.labelers) expect(l.temperature).toBe(0);
  });

  it("the experiment file exists and names the tests that hold it up", () => {
    const path = resolve(REPO_ROOT, "docs/experimentos/002-o-que-o-corpus-assistido-consegue-publicar.md");
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("test/eval/assisted-corpus.test.ts");
    expect(text).toContain("test/eval/assisted-rate.test.ts");
  });
});
