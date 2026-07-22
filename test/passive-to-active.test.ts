/**
 * Voz passiva → ativa (ação Tier 2, ADR-032). Testa a classificação (A/B/C), a montagem EXATA do
 * rascunho e a disciplina do projeto: nenhuma conversão insegura. Os findings vêm do `analyze` real
 * (com o `meta` que o pass emite), não construídos à mão.
 */
import { describe, expect, it } from "vitest";
import { analyze, applyPassiveWithAgent, passiveToActive, type Finding, type PassiveRewrite } from "../src/lucid";

function firstPassive(text: string): { finding: Finding; source: string } {
  const d = analyze(text);
  const finding = d.findings.find((f) => f.criterion === "passive_voice");
  if (!finding) throw new Error(`sem finding de voz passiva em: ${text}`);
  return { finding, source: d.text };
}

/** Aplica o rascunho automático ao texto inteiro (o que a UI faz via studio). */
function applied(source: string, r: PassiveRewrite): string {
  if (r.kind !== "automatic") throw new Error(`esperava automatic, veio ${r.kind}`);
  return source.slice(0, r.target.start) + r.replacement + source.slice(r.target.end);
}

describe("Classe A — conversão automática (agente explícito)", () => {
  it("O relatório foi enviado pela comissão. → A comissão enviou o relatório.", () => {
    const { finding, source } = firstPassive("O relatório foi enviado pela comissão.");
    const r = passiveToActive(finding, source);
    expect(r.kind).toBe("automatic");
    if (r.kind === "automatic") {
      expect(r.replacement).toBe("A comissão enviou o relatório");
      expect(applied(source, r)).toBe("A comissão enviou o relatório.");
    }
  });

  it("A decisão foi tomada pelo juiz. → O juiz tomou a decisão.", () => {
    const { finding, source } = firstPassive("A decisão foi tomada pelo juiz.");
    const r = passiveToActive(finding, source);
    expect(applied(source, r)).toBe("O juiz tomou a decisão.");
  });

  it("plural do agente concorda o verbo: pelas comissões → enviaram", () => {
    const { finding, source } = firstPassive("Os relatórios foram enviados pelas comissões.");
    const r = passiveToActive(finding, source);
    expect(applied(source, r)).toBe("As comissões enviaram os relatórios.");
  });

  it("agente com adjunto (limite incerto) → unsupported, nunca rascunho errado", () => {
    // o pass estende o agente de forma gulosa e absorve "em segunda instância"; o gate recusa.
    const { finding, source } = firstPassive("O pedido foi analisado pela equipe em segunda instância.");
    expect(passiveToActive(finding, source).kind).toBe("unsupported");
  });
});

describe("Classe B — conversão parametrizada (só falta o agente)", () => {
  it("O relatório foi enviado. → needsAgent, e com o agente monta o rascunho", () => {
    const { finding, source } = firstPassive("O relatório foi enviado.");
    const r = passiveToActive(finding, source);
    expect(r.kind).toBe("needsAgent");
    if (r.kind === "needsAgent") {
      expect(r.verbLemma).toBe("enviar");
      expect(r.tense).toBe("pret");
      expect(r.object).toBe("O relatório");
    }
    const applied1 = applyPassiveWithAgent(finding, source, "a comissão");
    expect(applied(source, applied1)).toBe("A comissão enviou o relatório.");
  });

  it("deriva o número do artigo do agente digitado (as comissões → enviaram)", () => {
    const { finding, source } = firstPassive("O relatório foi enviado.");
    const r = applyPassiveWithAgent(finding, source, "as comissões");
    expect(applied(source, r)).toBe("As comissões enviaram o relatório.");
  });

  it("preserva adjunto após o particípio (só falta o agente)", () => {
    const { finding, source } = firstPassive("O relatório foi enviado ontem.");
    const r = applyPassiveWithAgent(finding, source, "a comissão");
    expect(applied(source, r)).toBe("A comissão enviou o relatório ontem.");
  });
});

describe("Classe C — não conversível (unsupported)", () => {
  it("tempo composto (tinha sido) → unsupported", () => {
    const { finding, source } = firstPassive("O relatório tinha sido enviado pela comissão.");
    expect(passiveToActive(finding, source).kind).toBe("unsupported");
  });

  it("verbo fora da tabela fechada → unsupported", () => {
    const { finding, source } = firstPassive("O prédio foi demolido pela prefeitura.");
    expect(passiveToActive(finding, source).kind).toBe("unsupported");
  });

  it("applyPassiveWithAgent num caso unsupported continua unsupported", () => {
    const { finding, source } = firstPassive("O relatório tinha sido enviado.");
    expect(applyPassiveWithAgent(finding, source, "a comissão").kind).toBe("unsupported");
  });
});

describe("disciplina: nenhuma conversão insegura", () => {
  // Cada trecho rotulado à mão: classe esperada. Se algum 'automatic' sair diferente do esperado,
  // é conversão insegura → build vermelho (métrica dura do projeto).
  const CASES: { text: string; expect: PassiveRewrite["kind"]; result?: string }[] = [
    { text: "O documento foi assinado pelo diretor.", expect: "automatic", result: "O diretor assinou o documento." },
    { text: "As contas foram aprovadas pelo conselho.", expect: "automatic", result: "O conselho aprovou as contas." },
    { text: "O parecer foi elaborado.", expect: "needsAgent" },
    { text: "A obra será realizada pela empreiteira.", expect: "automatic", result: "A empreiteira realizará a obra." },
    { text: "O recurso é apreciado pelo relator.", expect: "automatic", result: "O relator aprecia o recurso." },
  ];

  it.each(CASES)("$text → $expect", (c) => {
    const { finding, source } = firstPassive(c.text);
    const r = passiveToActive(finding, source);
    expect(r.kind).toBe(c.expect);
    if (c.result) expect(applied(source, r)).toBe(c.result);
  });
});
