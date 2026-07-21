import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { passiveScaffold } from "../src/lucid/core/actions/passive-scaffold";
import type { Finding } from "../src/lucid/core/types";

function agentPassive(text: string): { finding: Finding; source: string } {
  const d = analyze(text);
  const finding = d.findings.find((f) => f.criterion === "passive_voice" && f.meta?.hasAgent === true);
  if (!finding) throw new Error(`sem passiva-com-agente em: ${text}`);
  return { finding, source: d.text };
}

describe("passiveScaffold — papéis extraídos do texto", () => {
  it("passiva canônica: agente e ação vêm literais; verbo-base da tabela fechada", () => {
    const { finding, source } = agentPassive("O pedido foi aprovado pela comissão competente.");
    const s = passiveScaffold(finding, source)!;

    expect(s.agent).toBe("comissão competente");
    expect(s.action.participle).toBe("aprovado");
    expect(s.action.baseVerb).toBe("aprovar");
  });

  it("o objeto da ativa é o sujeito da passiva (o sintagma antes de 'ser')", () => {
    const { finding, source } = agentPassive("A proposta foi rejeitada pela diretoria.");
    const s = passiveScaffold(finding, source)!;

    expect(s.action.participle).toBe("rejeitada");
    expect(s.action.baseVerb).toBe("rejeitar");
    expect(s.agent).toBe("diretoria");
    expect(s.object).toBe("A proposta");
  });

  it("frase que começa no próprio verbo não tem sujeito antes → object null (não inventa)", () => {
    const { finding, source } = agentPassive("Foi assinado pelo presidente.");
    const s = passiveScaffold(finding, source)!;
    expect(s.agent).toBe("presidente");
    expect(s.object).toBeNull();
  });

  it("normaliza gênero/número para o verbo-base (feminino/plural)", () => {
    const plural = agentPassive("As contas foram analisadas pelas auditoras.");
    expect(passiveScaffold(plural.finding, plural.source)!.action.baseVerb).toBe("analisar");

    const irregularPlural = agentPassive("Os relatórios foram entregues pelos servidores.");
    expect(passiveScaffold(irregularPlural.finding, irregularPlural.source)!.action.baseVerb).toBe("entregar");
  });

  it("particípio fora da tabela: baseVerb null, particípio ainda literal (não inventa verbo)", () => {
    const { finding, source } = agentPassive("O muro foi pichado pelos manifestantes.");
    const s = passiveScaffold(finding, source)!;
    expect(s.action.participle).toBe("pichado");
    expect(s.action.baseVerb).toBeNull();
    expect(s.agent).toBe("manifestantes");
  });
});

describe("passiveScaffold — recusas honestas", () => {
  it("passiva SEM agente não gera andaime (retorna null)", () => {
    const d = analyze("O pedido foi aprovado.");
    const finding = d.findings.find((f) => f.criterion === "passive_voice")!;
    expect(finding.meta?.hasAgent).toBe(false);
    expect(passiveScaffold(finding, d.text)).toBeNull();
  });

  it("finding de outro critério retorna null", () => {
    const d = analyze("É preciso fazer a verificação dos requisitos.");
    const finding = d.findings.find((f) => f.criterion !== "passive_voice");
    if (finding) expect(passiveScaffold(finding, d.text)).toBeNull();
  });
});

describe("passiveScaffold — determinismo e honestidade", () => {
  it("mesmo finding produz sempre o mesmo andaime (JSON idêntico)", () => {
    const { finding, source } = agentPassive("O contrato foi assinado pelo presidente da empresa.");
    const r1 = JSON.stringify(passiveScaffold(finding, source));
    const r2 = JSON.stringify(passiveScaffold(finding, source));
    expect(r2).toBe(r1);
  });

  it("todo campo não-nulo é substring literal do texto (nada fabricado)", () => {
    const { finding, source } = agentPassive("O texto foi revisado pela equipe editorial.");
    const s = passiveScaffold(finding, source)!;
    expect(source).toContain(s.agent);
    expect(source).toContain(s.action.participle);
    if (s.object) expect(source).toContain(s.object);
  });
});
