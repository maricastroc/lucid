import { describe, expect, it } from "vitest";
import { interpret } from "../src/lucid/probe/interpret";
import { StubComprehensionProbe } from "../src/lucid/probe/stub-probe";
import type { ProbeResult } from "../src/lucid/probe/types";

function result(over: Partial<ProbeResult>): ProbeResult {
  return {
    podeResponder: true,
    respostaExtraida: "o fato",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
    ...over,
  };
}

describe("interpret — regra de piso (I5: nunca aprovação)", () => {
  it("podeResponder=false → flag", () => {
    expect(interpret(result({ podeResponder: false })).tipo).toBe("flag");
  });

  it("precisouInferir=true → flag (mesmo podendo responder)", () => {
    expect(interpret(result({ precisouInferir: true })).tipo).toBe("flag");
  });

  it("consegue responder sem inferir → neutro (o MELHOR caso possível, não aprovação)", () => {
    const signal = interpret(result({}));
    expect(signal.tipo).toBe("neutro");
    if (signal.tipo === "neutro") {
      expect(signal.nota).toBe("sem violação de piso detectada (não é garantia de compreensão)");
    }
  });

  it("nenhum ProbeResult produz uma variante 'aprovado' — só 'flag' ou 'neutro'", () => {
    for (const r of [result({}), result({ podeResponder: false }), result({ precisouInferir: true })]) {
      expect(["flag", "neutro"]).toContain(interpret(r).tipo);
    }
  });

  it("propaga as operações de leitura como proxy de carga estrutural", () => {
    const signal = interpret(result({ operacoesDeLeitura: ["segurar_sujeito_longo", "integrar_entre_frases"] }));
    expect(signal.operacoes).toEqual(["segurar_sujeito_longo", "integrar_entre_frases"]);
  });
});

describe("StubComprehensionProbe — determinístico", () => {
  it("devolve o fixture do trecho; default pessimista fora dele", async () => {
    const probe = new StubComprehensionProbe({ "trecho A": result({ podeResponder: true }) });
    expect((await probe.probe({ trecho: "trecho A", pergunta: "?" })).podeResponder).toBe(true);
    expect((await probe.probe({ trecho: "desconhecido", pergunta: "?" })).podeResponder).toBe(false);
  });

  it("mesma entrada → mesma saída", async () => {
    const probe = new StubComprehensionProbe({});
    const a = await probe.probe({ trecho: "x", pergunta: "?" });
    const b = await probe.probe({ trecho: "x", pergunta: "?" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
