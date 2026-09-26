import { describe, expect, it } from "vitest";
import { analyze } from "../src/locales/pt-BR";
import {
  NOT_VERIFIED,
  OVERCLAIM_VOCABULARY,
  PROOF_CHECKS,
  SIGNAL_CHECKS,
  verifyRewrite,
  type RewriteVerification,
} from "../src/report/rewrite";
import { StubComprehensionProbe } from "../src/lucid/probe/stub-probe";

const TEXT =
  "Em 10/05/2024, o pedido supracitado de reajuste de 30 dias foi encaminhado para análise e o resultado final desse exame " +
  "minucioso foi comunicado ao interessado dentro do prazo regular previsto no edital da secretaria competente.";

const KNOWN_OVERCLAIMS: readonly string[] = ["A nova versão não inventa agente em primeira pessoa"];

async function everyCheck(proposed: string): Promise<RewriteVerification> {
  const findings = analyze(TEXT).findings;
  const passive = findings.find((f) => f.criterion === "passive_voice" && f.requiresHuman)!;
  const target = { start: 0, end: TEXT.length, text: TEXT };
  return verifyRewrite(
    TEXT,
    target,
    { proposerId: "test", original: TEXT, proposed },
    {
      criterion: "long_sentence",
      findings,
      declarations: [{ span: passive.span, agent: "a secretaria" }],
      probe: new StubComprehensionProbe({}),
      question: "Qual é o fato principal?",
    },
  );
}

const PROPOSALS = [
  "Em 10/05/2024, a secretaria encaminhou o pedido de reajuste de 30 dias para análise. O resultado foi comunicado ao interessado no prazo do edital.",
  "Nós analisamos o pedido de 31 dias. O resultado saiu.",
  TEXT,
];

describe("registro de verificações — o que cada verificação é autorizada a afirmar", () => {
  it("toda verificação emitida está registrada, e o tipo bate com onde ela aparece", async () => {
    for (const proposed of PROPOSALS) {
      const v = await everyCheck(proposed);
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

  it("o cenário exercita todas as verificações registradas", async () => {
    const emitted = new Set<string>();
    for (const proposed of PROPOSALS) {
      const v = await everyCheck(proposed);
      v.proofs.forEach((p) => emitted.add(p.check));
      v.signals.forEach((s) => emitted.add(s.check));
    }
    expect([...emitted].sort()).toEqual([...Object.keys(PROOF_CHECKS), ...Object.keys(SIGNAL_CHECKS)].sort());
  });

  it("toda verificação declara o que prova, o limite e a ADR", () => {
    for (const [id, spec] of [...Object.entries(PROOF_CHECKS), ...Object.entries(SIGNAL_CHECKS)]) {
      expect(spec.proves.length, id).toBeGreaterThan(20);
      expect(spec.limit.length, id).toBeGreaterThan(10);
      expect(spec.adr, id).toMatch(/^ADR-\d{3}$/u);
    }
  });

  it("as dimensões não verificadas são únicas e nomeadas", () => {
    expect(new Set(NOT_VERIFIED.map((d) => d.id)).size).toBe(NOT_VERIFIED.length);
    for (const d of NOT_VERIFIED) expect(d.what.length).toBeGreaterThan(5);
  });

  it("nenhum texto de garantia ou efeito afirma mais do que a prova, fora os casos conhecidos que a Etapa 3 corrige", async () => {
    const offending = new Set<string>();
    for (const proposed of PROPOSALS) {
      const v = await everyCheck(proposed);
      for (const p of v.proofs) if (OVERCLAIM_VOCABULARY.test(p.detail)) offending.add(p.detail);
    }
    expect([...offending].sort()).toEqual([...KNOWN_OVERCLAIMS].sort());
  });
});
