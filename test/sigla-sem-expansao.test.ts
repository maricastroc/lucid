import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "sigla_sem_expansao")
    .map((f) => f.span.text);

describe("sigla_sem_expansao — detecção", () => {
  it("sigla usada sem definição prévia dispara na 1ª ocorrência", () => {
    expect(spans("A LGPD entrou em vigor e mudou tudo.")).toEqual(["LGPD"]);
  });

  it("marca só a PRIMEIRA ocorrência não definida, não as repetições", () => {
    expect(spans("O CADE analisou o caso. Depois, o CADE arquivou o processo. O CADE decidiu.")).toEqual(["CADE"]);
  });

  it("proveniência e severidade corretas (warning, requiresHuman, sem sugestão, ISO 5.3.2)", () => {
    const f = analyze("A LGPD entrou em vigor.").findings.find((x) => x.criterion === "sigla_sem_expansao")!;
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("iso-24495-1");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference?.section).toBe("5.3.2");
  });
});

describe("sigla_sem_expansao — definição reconhecida (não marca)", () => {
  it("padrão 'Nome Por Extenso (SIGLA)' define a sigla", () => {
    expect(spans("A Lei Geral de Proteção de Dados (LGPD) entrou em vigor. A LGPD mudou tudo.")).toEqual([]);
  });

  it("padrão 'SIGLA (Nome por extenso)' também define", () => {
    expect(spans("O CADE (Conselho Administrativo de Defesa Econômica) foi acionado. O CADE decidiu.")).toEqual([]);
  });

  it("uso ANTES da definição tardia ainda marca a primeira ocorrência", () => {
    expect(spans("A LGPD é recente. A Lei Geral de Proteção de Dados (LGPD) trata disso.")).toEqual(["LGPD"]);
  });
});

describe("sigla_sem_expansao — precisão (baixo falso positivo)", () => {
  it("siglas universais/UFs/unidades não marcam (allowlist)", () => {
    expect(spans("Informe o CPF e o CEP. O processo tramita em SP e no RJ.")).toEqual([]);
    expect(spans("O arquivo tem 10 MB e está em PDF.")).toEqual([]);
  });

  it("numerais romanos não marcam", () => {
    expect(spans("O Capítulo II e o Título IV tratam do tema. A Guerra XII foi longa.")).toEqual([]);
  });

  it("caixa-alta de ênfase/título (run de maiúsculas) não marca", () => {
    expect(spans("REGRAS GERAIS DA EMPRESA")).toEqual([]);
    expect(spans("LEIA COM ATENÇÃO ANTES DE ASSINAR")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, siglaSemExpansao: { enabled: false } };
    expect(analyze("A LGPD entrou em vigor.", config).findings.filter((f) => f.criterion === "sigla_sem_expansao")).toEqual([]);
  });
});
