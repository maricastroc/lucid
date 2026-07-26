import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { passiveScaffold } from "../src/locales/pt-BR/actions/passive-scaffold";
import type { Finding } from "../src/lucid/core/types";

function agentPassive(text: string): { finding: Finding; source: string } {
  const d = analyze(text);
  const finding = d.findings.find((f) => f.criterion === "passive_voice" && f.meta?.hasAgent === true);
  if (!finding) throw new Error(`no passive-with-agent in: ${text}`);
  return { finding, source: d.text };
}

describe("passiveScaffold — roles extracted from the text", () => {
  it("canonical passive: agent and action come out literal; base verb from the closed table", () => {
    const { finding, source } = agentPassive("O pedido foi aprovado pela comissão competente.");
    const s = passiveScaffold(finding, source)!;

    expect(s.agent).toBe("comissão competente");
    expect(s.action.participle).toBe("aprovado");
    expect(s.action.baseVerb).toBe("aprovar");
  });

  it("the object of the active is the subject of the passive (the phrase before 'ser')", () => {
    const { finding, source } = agentPassive("A proposta foi rejeitada pela diretoria.");
    const s = passiveScaffold(finding, source)!;

    expect(s.action.participle).toBe("rejeitada");
    expect(s.action.baseVerb).toBe("rejeitar");
    expect(s.agent).toBe("diretoria");
    expect(s.object).toBe("A proposta");
  });

  it("a sentence starting at the verb itself has no subject before it → object null (nothing invented)", () => {
    const { finding, source } = agentPassive("Foi assinado pelo presidente.");
    const s = passiveScaffold(finding, source)!;
    expect(s.agent).toBe("presidente");
    expect(s.object).toBeNull();
  });

  it("normalizes gender/number to reach the base verb (feminine/plural)", () => {
    const plural = agentPassive("As contas foram analisadas pelas auditoras.");
    expect(passiveScaffold(plural.finding, plural.source)!.action.baseVerb).toBe("analisar");

    const irregularPlural = agentPassive("Os relatórios foram entregues pelos servidores.");
    expect(passiveScaffold(irregularPlural.finding, irregularPlural.source)!.action.baseVerb).toBe("entregar");
  });

  it("a regular -ado participle outside the table: the deterministic rule resolves the infinitive (analysis, not generation — ADR-054)", () => {
    const { finding, source } = agentPassive("O muro foi pichado pelos manifestantes.");
    const s = passiveScaffold(finding, source)!;
    expect(s.action.participle).toBe("pichado");
    expect(s.action.baseVerb).toBe("pichar");
    expect(s.agent).toBe("manifestantes");
  });

  it("an ambiguous -ido participle outside the table: baseVerb null (it does not guess -er/-ir)", () => {
    const { finding, source } = agentPassive("O metal foi fundido pela siderúrgica.");
    const s = passiveScaffold(finding, source)!;
    expect(s.action.participle).toBe("fundido");
    expect(s.action.baseVerb).toBeNull();
  });
});

describe("passiveScaffold — honest refusals", () => {
  it("a passive WITHOUT an agent yields no scaffold (returns null)", () => {
    const d = analyze("O pedido foi aprovado.");
    const finding = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(finding.meta?.hasAgent).toBe(false);
    expect(passiveScaffold(finding, d.text)).toBeNull();
  });

  it("a finding from another criterion returns null", () => {
    const d = analyze("É preciso fazer a verificação dos requisitos.");
    const finding = d.findings.find((f) => f.criterion !== "passive_voice");
    if (finding) expect(passiveScaffold(finding, d.text)).toBeNull();
  });
});

describe("passiveScaffold — determinism and honesty", () => {
  it("the same finding always produces the same scaffold (identical JSON)", () => {
    const { finding, source } = agentPassive("O contrato foi assinado pelo presidente da empresa.");
    const r1 = JSON.stringify(passiveScaffold(finding, source));
    const r2 = JSON.stringify(passiveScaffold(finding, source));
    expect(r2).toBe(r1);
  });

  it("every non-null field is a literal substring of the text (nothing fabricated)", () => {
    const { finding, source } = agentPassive("O texto foi revisado pela equipe editorial.");
    const s = passiveScaffold(finding, source)!;
    expect(source).toContain(s.agent);
    expect(source).toContain(s.action.participle);
    if (s.object) expect(source).toContain(s.object);
  });
});
