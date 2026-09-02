import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "@/lucid";
import { buildConfidence, detectedProse, detectionHeadline } from "@/app/lib/narrative";

const passivas = (text: string): Finding[] => analyze(text).findings.filter((f) => f.criterion === "passive_voice");

const PREDICATIVOS = [
  "O servidor é qualificado para a função.",
  "A equipe é qualificada.",
  "Os candidatos são qualificados.",
  "O procedimento é complicado.",
  "A regra é conhecida de todos.",
  "O prazo é adequado ao caso.",
  "A sala é reservada aos servidores.",
  "O caso é isolado.",
  "O servidor é aposentado.",
  "O valor é elevado.",
  "A informação é detalhada.",
  "A decisão é motivada.",
];

const GRAU = [
  "O servidor é muito qualificado.",
  "O servidor é bastante qualificado.",
  "O servidor é altamente qualificado.",
  "O servidor é mais qualificado que o outro.",
  "O prazo é razoavelmente adequado.",
];

const SUJEITO_POSPOSTO = [
  "Art. 4º São criadas, na Tabela, as funções de assessoramento.",
  "Art. 1º É incluída, no Quadro de Pessoal, a categoria funcional.",
  "É vedada a cobrança de qualquer taxa.",
  "§ 2º É assegurada a manutenção do crédito.",
  "São criados os cargos em comissão.",
];

describe("`ser` no presente sem agente — o sujeito antes do verbo decide", () => {
  it.each(PREDICATIVOS)("%s → nenhum apontamento: o sujeito vem antes, a leitura pode ser propriedade", (text) => {
    expect(passivas(text)).toHaveLength(0);
  });

  it.each(GRAU)("%s → nenhum apontamento, com ou sem advérbio de grau", (text) => {
    expect(passivas(text)).toHaveLength(0);
  });

  it("trata o advérbio de grau igual, termine ele em -mente ou não", () => {
    expect(passivas("O servidor é muito qualificado.")).toEqual(passivas("O servidor é altamente qualificado."));
  });

  it.each(SUJEITO_POSPOSTO)("%s → apontado: a oração abre no verbo, o sujeito vem depois", (text) => {
    const [finding] = passivas(text);
    expect(finding, text).toBeDefined();
    expect(finding.meta).toMatchObject({ eventiveness: "postposed_subject", hasAgent: false });
    expect(finding.severity).toBe("warning");
    expect(finding.requiresHuman).toBe(true);
  });

  it("não confunde cabeça de item de norma com sujeito", () => {
    expect(passivas("É vedada a cobrança.")).toHaveLength(1);
    expect(passivas("Art. 19. É vedada a cobrança.")).toHaveLength(1);
    expect(passivas("§ 2º É vedada a cobrança.")).toHaveLength(1);
    expect(passivas("A cobrança é vedada.")).toHaveLength(0);
  });

  it("não toca nos tempos eventivos nem no agente explícito, que já eram decidíveis", () => {
    expect(passivas("A proposta foi aprovada.")[0].severity).toBe("warning");
    expect(passivas("A proposta foi aprovada.")[0].requiresHuman).toBe(true);
    expect(passivas("O pedido será analisado pelo setor.")[0].requiresHuman).toBe(false);
    expect(passivas("O servidor é qualificado pela banca.")[0].meta).toMatchObject({ eventiveness: "agent" });
  });
});

describe("o que o leitor vê quando o sujeito está posposto", () => {
  const finding = () => passivas("É vedada a cobrança de qualquer taxa.")[0];

  it("afirma a passiva em vez de sugerir que talvez seja uma", () => {
    for (const lang of ["pt-BR", "en"] as const) {
      const headline = detectionHeadline(finding(), lang);
      expect(headline.toLowerCase()).not.toMatch(/pode ser|may be/);
      expect(headline.toLowerCase()).toMatch(/posposto|postposed/);
    }
  });

  it("nomeia a ordem verbo-sujeito como a razão, nos dois idiomas", () => {
    expect(detectedProse(finding(), "pt-BR")).toMatch(/sujeito vem depois|começa no verbo/i);
    expect(detectedProse(finding(), "en")).toMatch(/subject follows|opens on the verb/i);
  });

  it("continua se recusando a inventar o agente ausente", () => {
    expect(buildConfidence(finding(), "pt-BR").rationale).toMatch(/não está no texto|recusa a inventar/i);
  });
});
