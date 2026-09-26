import { describe, expect, it } from "vitest";
import { analyze } from "../src/locales/pt-BR";
import {
  needsAuthorDecision,
  NOT_VERIFIED,
  OVERCLAIM_VOCABULARY,
  PROOF_CHECKS,
  type RewriteVerification,
  SIGNAL_CHECKS,
  type VerifyOptions,
  verifyRewrite,
} from "../src/report/rewrite";

const TEXT =
  "Em 10/05/2024, o pedido supracitado de reajuste de 30 dias foi encaminhado para análise e o resultado final desse exame " +
  "minucioso foi comunicado ao interessado dentro do prazo regular previsto no edital da secretaria competente.";

const PLAIN = "O pedido foi analisado pela equipe e o resultado foi comunicado ao interessado.";

const FIRST_PERSON_DOC = "Nós recebemos o pedido. O pedido foi analisado pela equipe.";

const FOCUS_DOC = "O pedido foi indeferido ontem. A decisão foi comunicada ao interessado.";

const LAW =
  "Art. 7º O prazo de 30 dias previsto no caput do art. 5º da Lei nº 8.112, de 11 de dezembro de 1990, gera multa de 2%.";

interface Scenario {
  readonly text: string;
  readonly proposed: string;
  readonly options: (text: string) => VerifyOptions;
  readonly start?: number;
}

const whole = (text: string) => ({ start: 0, end: text.length, text });

function fullOptions(text: string): VerifyOptions {
  const findings = analyze(text).findings;
  const passive = findings.find((f) => f.criterion === "passive_voice" && f.requiresHuman)!;
  return {
    criterion: "long_sentence",
    findings,
    declarations: [{ span: passive.span, agent: "a secretaria" }],
  };
}

function jargonOnly(text: string): VerifyOptions {
  return { findings: analyze(text).findings.filter((f) => f.criterion === "jargon") };
}

function focusOn(text: string): VerifyOptions {
  const passive = analyze(text).findings.find(
    (f) => f.criterion === "passive_voice" && f.span.text.includes("indeferido"),
  )!;
  return {
    criterion: "passive_voice",
    focus: passive.span,
    declarations: [{ span: passive.span, agent: "a comissão" }],
  };
}

const SCENARIOS: readonly Scenario[] = [
  {
    text: TEXT,
    proposed:
      "Em 10/05/2024, a secretaria encaminhou o pedido de reajuste de 30 dias para análise. O resultado foi comunicado ao interessado no prazo do edital.",
    options: fullOptions,
  },
  {
    text: TEXT,
    proposed: "Nós analisamos, em sede de recurso, o pedido de 31 dias. O resultado saiu.",
    options: fullOptions,
  },
  { text: TEXT, proposed: TEXT, options: fullOptions },
  {
    text: TEXT,
    proposed: `${TEXT} Ademais, foi determinado em 11/05/2024 que o pedido supracitado seria reexaminado pela autoridade competente em momento oportuno.`,
    options: fullOptions,
  },
  {
    text: TEXT,
    proposed:
      "Em 10/05/2024, o pedido de reajuste de 30 dias foi encaminhado para análise. O resultado foi comunicado ao interessado.",
    options: jargonOnly,
  },
  { text: TEXT, proposed: TEXT, options: jargonOnly },
  { text: PLAIN, proposed: "A equipe analisou o pedido e comunicou o resultado ao interessado.", options: () => ({}) },
  { text: PLAIN, proposed: "A equipe analisou o pedido em 2 dias.", options: () => ({}) },
  {
    text: FIRST_PERSON_DOC,
    proposed: "Nós analisamos o pedido.",
    options: () => ({}),
    start: FIRST_PERSON_DOC.indexOf("O pedido"),
  },
  {
    text: PLAIN,
    proposed: "Nós analisamos o pedido e comunicamos o resultado ao interessado.",
    options: (text) => ({
      declarations: [{ span: analyze(text).findings.find((f) => f.criterion === "passive_voice")!.span, agent: "nós" }],
    }),
  },
  {
    text: LAW,
    proposed:
      "Art. 7º A multa de 2% vale para o prazo de 30 dias previsto no caput do artigo 5º da Lei nº 8.112, de 11 de dezembro de 1990.",
    options: () => ({}),
  },
  {
    text: LAW,
    proposed:
      "Art. 8º O prazo de 30 meses previsto no § 1º do art. 5º da Lei nº 8.112 gera multa de **2%**, desde 12 de dezembro de 1990.",
    options: () => ({}),
  },
  {
    text: FOCUS_DOC,
    proposed: "A comissão indeferiu o pedido ontem. A decisão foi comunicada ao interessado.",
    options: focusOn,
  },
];

async function run(scenario: Scenario): Promise<RewriteVerification> {
  const start = scenario.start ?? 0;
  const target = { start, end: scenario.text.length, text: scenario.text.slice(start) };
  return verifyRewrite(
    scenario.text,
    start === 0 ? whole(scenario.text) : target,
    { proposerId: "test", original: target.text, proposed: scenario.proposed },
    scenario.options(scenario.text),
  );
}

async function runAll(): Promise<RewriteVerification[]> {
  return Promise.all(SCENARIOS.map(run));
}

describe("check registry — what each verification is allowed to claim", () => {
  it("every emitted verification is registered, and its kind matches where it appears", async () => {
    for (const v of await runAll()) {
      for (const p of v.proofs) {
        expect(PROOF_CHECKS[p.check], p.check).toBeDefined();
        expect(["guarantee", "effect"]).toContain(PROOF_CHECKS[p.check].kind);
      }
      for (const s of v.signals) {
        expect(SIGNAL_CHECKS[s.check], s.check).toBeDefined();
        expect(["signal", "probabilistic"]).toContain(SIGNAL_CHECKS[s.check].kind);
      }
    }
  });

  it("the scenarios exercise every registered verification", async () => {
    const emitted = new Set<string>();
    for (const v of await runAll()) {
      v.proofs.forEach((p) => emitted.add(p.check));
      v.signals.forEach((s) => emitted.add(s.check));
    }
    expect([...emitted].sort()).toEqual([...Object.keys(PROOF_CHECKS), ...Object.keys(SIGNAL_CHECKS)].sort());
  });

  it("each proof emits only the outcomes it declares, and the scenarios reach every one of them", async () => {
    const reached = new Map<string, Set<string>>();
    for (const v of await runAll()) {
      for (const p of v.proofs) {
        expect(PROOF_CHECKS[p.check].outcomes, p.check).toContain(p.outcome);
        reached.set(p.check, (reached.get(p.check) ?? new Set()).add(p.outcome));
      }
    }
    for (const [check, spec] of Object.entries(PROOF_CHECKS)) {
      expect([...(reached.get(check) ?? [])].sort(), check).toEqual([...spec.outcomes].sort());
    }
  });

  it("only guarantees can report an addition or say they do not apply", () => {
    for (const [check, spec] of Object.entries(PROOF_CHECKS)) {
      if (spec.kind === "effect") expect(spec.outcomes, check).toEqual(["confirmed", "not_confirmed"]);
    }
  });

  it("a proof passes exactly when it is confirmed or does not apply", async () => {
    for (const v of await runAll()) {
      for (const p of v.proofs) {
        expect(p.passed, p.check).toBe(p.outcome === "confirmed" || p.outcome === "not_applicable");
      }
    }
  });

  it("only a guarantee that is not confirmed or an addition asks the author to decide; an unmet effect never does", async () => {
    let effectOnly = 0;
    for (const v of await runAll()) {
      const guaranteeDivergence = v.proofs.some(
        (p) =>
          PROOF_CHECKS[p.check].kind === "guarantee" && (p.outcome === "not_confirmed" || p.outcome === "addition"),
      );
      expect(needsAuthorDecision(v)).toBe(guaranteeDivergence);
      if (!guaranteeDivergence && v.proofs.some((p) => !p.passed)) effectOnly++;
    }
    expect(effectOnly).toBeGreaterThan(0);
  });

  it("every verification declares what it proves and its limit", () => {
    for (const [id, spec] of [...Object.entries(PROOF_CHECKS), ...Object.entries(SIGNAL_CHECKS)]) {
      expect(spec.proves.length, id).toBeGreaterThan(20);
      expect(spec.limit.length, id).toBeGreaterThan(10);
    }
  });

  it("the unverified dimensions are unique and named, and written numbers and dates are among them", () => {
    expect(new Set(NOT_VERIFIED.map((d) => d.id)).size).toBe(NOT_VERIFIED.length);
    for (const d of NOT_VERIFIED) expect(d.what.length).toBeGreaterThan(5);
    expect(NOT_VERIFIED.map((d) => d.id)).toEqual(expect.arrayContaining(["written_numbers", "written_dates"]));
  });

  it("no proof, signal or notice message uses the overclaim vocabulary", async () => {
    const messages = new Set<string>();
    for (const v of await runAll()) {
      v.proofs.forEach((p) => messages.add(p.detail));
      v.signals.forEach((s) => messages.add(s.detail));
      v.notices.forEach((n) => messages.add(n.detail));
    }
    expect(messages.size).toBeGreaterThan(30);
    expect([...messages].filter((m) => OVERCLAIM_VOCABULARY.test(m))).toEqual([]);
  });
});
