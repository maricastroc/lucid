import { describe, expect, it } from "vitest";
import { analyze, passiveScaffold } from "../src/locales/pt-BR";

function passives(text: string) {
  return analyze(text).findings.filter((f) => f.criterion === "passive_voice");
}

describe("passive voice — the agent that comes after a postposed subject", () => {
  it("finds the agent after the subject, not only right after the participle", () => {
    const text = "Foi realizada a análise do documento pela comissão competente.";
    const [finding] = passives(text);
    expect(finding.meta?.hasAgent).toBe(true);
    expect(finding.meta?.agentAfterSubject).toBe(true);
    expect(finding.requiresHuman).toBe(false);
    expect(finding.span.text).toContain("pela comissão competente");
  });

  it("accepts a proper noun or an indefinite agent after the subject", () => {
    expect(passives("Foi aprovada a lei pela Câmara Municipal.")[0].meta?.hasAgent).toBe(true);
    expect(passives("Foram analisados os recursos por uma comissão especial.")[0].meta?.hasAgent).toBe(true);
  });

  it("still finds it when an adverbial before a comma opens the sentence", () => {
    expect(passives("Nesta data, foi realizada a análise pela comissão.")[0].meta?.hasAgent).toBe(true);
  });

  it.each([
    ["a nominal complement", "É vedada a cobrança pela prestação do serviço."],
    ["a time adjunct", "Foi realizada a análise pela manhã."],
    ["the agent of another participle", "Foi publicada a portaria elaborada pela comissão."],
    ["an agent past a coordination", "Foi feita a entrega dos documentos e a análise pela equipe."],
  ])("does not take %s for the agent", (_, text) => {
    const [finding] = passives(text);
    expect(finding.meta?.hasAgent).toBe(false);
    expect(finding.requiresHuman).toBe(true);
  });

  it("does not look past a subject that comes before the verb", () => {
    const [finding] = passives("O pedido foi indeferido ontem pela comissão.");
    expect(finding.meta?.agentAfterSubject).toBeUndefined();
  });

  it("gives the scaffold the postposed subject as the object", () => {
    const text = "Nesta data, foi realizada a análise do documento pela comissão.";
    const scaffold = passiveScaffold(passives(text)[0], text);
    expect(scaffold?.agent).toBe("comissão");
    expect(scaffold?.object).toBe("a análise do documento");
  });
});
