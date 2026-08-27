import { describe, expect, it } from "vitest";

import {
  agreementStats,
  compareRuns,
  routeLabel,
  spanExactRate,
  wilsonInterval,
} from "../../scripts/corpus/lib/agreement";
import type { LabelerRun, Occurrence } from "../../scripts/corpus/lib/types";

function run(overrides: Partial<LabelerRun>): LabelerRun {
  return {
    passageId: "p#0001",
    criterion: "sigla_sem_expansao",
    labelerId: "a",
    model: "m",
    promptVersion: "sigla@1",
    temperature: 0,
    ok: true,
    count: 0,
    occurrences: [],
    confidence: "alta",
    rawResponse: "",
    at: "2026-08-27T00:00:00Z",
    ...overrides,
  };
}

const at = (start: number, end: number, text: string): Occurrence => ({ start, end, text });

const POLICY = { consensusAuditRate: 0.05, lowConfidenceRoutes: true };

describe("spanExactRate", () => {
  it("é null quando ninguém marcou nada", () => {
    expect(spanExactRate([], [])).toBeNull();
  });

  it("é 1 quando os spans batem exatamente", () => {
    expect(spanExactRate([at(0, 5, "SEFAZ")], [at(0, 5, "SEFAZ")])).toBe(1);
  });

  it("penaliza pelo maior lado quando um marcou a mais", () => {
    expect(spanExactRate([at(0, 5, "SEFAZ")], [at(0, 5, "SEFAZ"), at(9, 12, "CGU")])).toBe(0.5);
  });

  it("não casa span deslocado", () => {
    expect(spanExactRate([at(0, 5, "SEFAZ")], [at(1, 6, "EFAZ_")])).toBe(0);
  });
});

describe("routeLabel", () => {
  it("manda divergência de contagem para a fila humana", () => {
    const runs = [run({ count: 1, occurrences: [at(0, 5, "SEFAZ")] }), run({ labelerId: "b", count: 0 })];
    const decision = routeLabel(runs, compareRuns(runs), POLICY, 0.9);
    expect(decision).toEqual({ route: "human_divergence", needsHuman: true });
  });

  it("manda span discordante para a fila humana mesmo com a mesma contagem", () => {
    const runs = [
      run({ count: 1, occurrences: [at(0, 5, "SEFAZ")] }),
      run({ labelerId: "b", count: 1, occurrences: [at(10, 13, "CGU")] }),
    ];
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.9).route).toBe("human_divergence");
  });

  it("manda confiança baixa para a fila humana", () => {
    const runs = [run({ confidence: "baixa" }), run({ labelerId: "b" })];
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.9).route).toBe("human_low_confidence");
  });

  it("manda falha de rotulador para a fila humana", () => {
    const runs = [run({ ok: false, error: "json inválido" }), run({ labelerId: "b" })];
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.9).route).toBe("human_labeler_failure");
  });

  it("sorteia a amostra de auditoria dentro dos consensuais", () => {
    const runs = [run({}), run({ labelerId: "b" })];
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.01).route).toBe("human_audit_sample");
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.5).route).toBe("auto_consensus");
  });

  it("consenso sem sorteio não pede humano", () => {
    const runs = [run({}), run({ labelerId: "b" })];
    expect(routeLabel(runs, compareRuns(runs), POLICY, 0.5).needsHuman).toBe(false);
  });
});

describe("agreementStats", () => {
  it("concordância perfeita", () => {
    const pairs = [
      { a: true, b: true },
      { a: false, b: false },
    ];
    const stats = agreementStats(pairs);
    expect(stats.rawAgreement).toBe(1);
    expect(stats.cohenKappa).toBe(1);
    expect(stats.gwetAc1).toBe(1);
  });

  it("expõe o paradoxo do kappa: κ desaba onde o AC1 se segura", () => {
    const pairs = [
      ...Array.from({ length: 97 }, () => ({ a: false, b: false })),
      { a: true, b: true },
      { a: true, b: false },
      { a: false, b: true },
    ];
    const stats = agreementStats(pairs);
    expect(stats.rawAgreement).toBe(0.98);
    expect(stats.cohenKappa).not.toBeNull();
    expect(stats.gwetAc1).not.toBeNull();
    expect(stats.cohenKappa as number).toBeLessThan(0.55);
    expect(stats.gwetAc1 as number).toBeGreaterThan(0.95);
  });

  it("devolve zeros sem amostra", () => {
    expect(agreementStats([]).n).toBe(0);
    expect(agreementStats([]).cohenKappa).toBeNull();
  });
});

describe("wilsonInterval", () => {
  it("é null sem amostra", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
  });

  it("não devolve intervalo degenerado quando não houve erro", () => {
    const interval = wilsonInterval(0, 40);
    expect(interval).not.toBeNull();
    expect((interval as { low: number }).low).toBe(0);
    expect((interval as { high: number }).high).toBeGreaterThan(0.05);
  });

  it("contém a proporção observada", () => {
    const interval = wilsonInterval(2, 40) as { low: number; high: number };
    expect(interval.low).toBeLessThan(0.05);
    expect(interval.high).toBeGreaterThan(0.05);
  });
});
