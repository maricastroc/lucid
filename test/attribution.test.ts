import { describe, expect, it } from "vitest";
import { affixSplice, analyze, type Finding } from "@/lucid";
import { attribute, balance, revisionBalance } from "@/app/lib/attribution";

const findings = (text: string): Finding[] => analyze(text).findings;
const change = (before: string, after: string) =>
  attribute(findings(before), findings(after), affixSplice(before, after));
const of = (before: string, after: string, criterion: string) =>
  change(before, after).changes.filter((c) => c.criterion === criterion);

const LONGA =
  "O interessado que pretenda obter a isenção deverá apresentar, no prazo de trinta dias contados da " +
  "publicação deste edital, o requerimento acompanhado da documentação comprobatória exigida pela comissão, " +
  "sob pena de indeferimento sumário do pedido formulado.";

describe("attribute — what one edit did, in the region it touched", () => {
  it("calls it resolved when the criterion stops firing there", () => {
    const [c] = of("O pedido foi indeferido pela comissão.", "A comissão indeferiu o pedido.", "passive_voice");
    expect(c).toMatchObject({ before: 1, after: 0, kind: "resolved", scope: "region" });
  });

  it("calls it kept when the passage was not touched by this criterion", () => {
    const antes = "O pedido foi indeferido. O prazo é de dez dias.";
    const depois = "O pedido foi indeferido. O prazo é de quinze dias.";
    expect(of(antes, depois, "passive_voice")).toEqual([]);
  });

  it("calls it reshaped when the same criterion still fires on rewritten text", () => {
    const [c] = of("O pedido foi indeferido.", "O pedido foi negado.", "passive_voice");
    expect(c).toMatchObject({ before: 1, after: 1, kind: "reshaped" });
  });

  it("calls it introduced when the edit created the problem", () => {
    const [c] = of("A comissão negou o pedido.", "O pedido foi negado.", "passive_voice");
    expect(c).toMatchObject({ before: 0, after: 1, kind: "introduced" });
  });

  it("calls it transformed when one occurrence became several, naming no survivor", () => {
    const dividida =
      "O interessado que pretenda obter a isenção deverá apresentar, no prazo de trinta dias contados da " +
      "publicação deste edital, o requerimento acompanhado da documentação. A documentação comprobatória " +
      "exigida pela comissão deve acompanhar o pedido, sob pena de indeferimento sumário do pedido que foi " +
      "formulado pelo interessado perante a administração competente.";
    const [c] = of(LONGA, dividida, "long_sentence");
    expect(c).toMatchObject({ before: 1, after: 2, kind: "transformed" });
  });

  it("resolves the long sentence when both halves come in under the threshold", () => {
    const curta = "O interessado deve apresentar o requerimento em trinta dias. A documentação acompanha o pedido.";
    const [c] = of(LONGA, curta, "long_sentence");
    expect(c).toMatchObject({ before: 1, after: 0, kind: "resolved" });
  });
});

describe("attribute — what the edit did somewhere else", () => {
  it("labels as indirect a finding that changed outside the region the author touched", () => {
    const antes =
      "# Título geral\n\n## Seção primeira\n\nUm parágrafo qualquer aqui.\n\n#### Subitem profundo\n\nOutro parágrafo.";
    const depois = "# Título geral\n\nUm parágrafo qualquer aqui.\n\n#### Subitem profundo\n\nOutro parágrafo.";
    const indiretos = change(antes, depois).changes.filter((c) => c.scope === "indirect");
    expect(indiretos.length).toBeGreaterThan(0);
    for (const c of indiretos) expect(c.kind).toBe("indirect");
  });

  it("says nothing about criteria the edit left alone", () => {
    const antes = "O pedido foi indeferido. O prazo é de dez dias.";
    const depois = "A comissão indeferiu o pedido. O prazo é de dez dias.";
    expect(change(antes, depois).changes.map((c) => c.criterion)).toEqual(["passive_voice"]);
  });
});

describe("balance — the whole revision, criterion by criterion", () => {
  const antes = "O pedido foi indeferido pela comissão em sede de procedimento.";
  const depois = "A comissão indeferiu o pedido durante o procedimento.";

  it("reports the count and the weight on both sides", () => {
    const passive = balance(findings(antes), findings(depois)).find((b) => b.criterion === "passive_voice")!;
    expect(passive).toMatchObject({ before: 1, after: 0, direction: "improved" });
    expect(passive.weightBefore).toBeGreaterThan(passive.weightAfter);
  });

  it("separates improvement from regression and from standing still", () => {
    const worse = balance(findings("A comissão negou o pedido."), findings("O pedido foi negado."));
    expect(worse.find((b) => b.criterion === "passive_voice")!.direction).toBe("regressed");
    const same = balance(findings(antes), findings(antes));
    for (const b of same) expect(b.direction).toBe("unchanged");
  });

  it("weighs an observation less than a warning, as the audit does", () => {
    const observacao = balance([], findings("O caso é complicado."));
    expect(observacao.find((b) => b.criterion === "passive_voice")!.weightAfter).toBeCloseTo(0.3);
  });

  it("totals the revision without hiding what got worse", () => {
    const total = revisionBalance(findings(antes), findings(depois));
    expect(total.countBefore).toBeGreaterThan(total.countAfter);
    expect(total.weightAfter).toBeLessThan(total.weightBefore);
  });
});
