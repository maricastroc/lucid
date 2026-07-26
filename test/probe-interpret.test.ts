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

describe("interpret — floor rule (I5: never an approval)", () => {
  it("podeResponder=false → flag", () => {
    expect(interpret(result({ podeResponder: false })).tipo).toBe("flag");
  });

  it("precisouInferir=true → flag (even when it can answer)", () => {
    expect(interpret(result({ precisouInferir: true })).tipo).toBe("flag");
  });

  it("answering without inferring → neutral (the BEST possible case, not an approval)", () => {
    const signal = interpret(result({}));
    expect(signal.tipo).toBe("neutro");
    if (signal.tipo === "neutro") {
      expect(signal.nota).toBe("sem violação de piso detectada (não é garantia de compreensão)");
    }
  });

  it("no ProbeResult produces an 'approved' variant — only 'flag' or 'neutro'", () => {
    for (const r of [result({}), result({ podeResponder: false }), result({ precisouInferir: true })]) {
      expect(["flag", "neutro"]).toContain(interpret(r).tipo);
    }
  });

  it("propagates the reading operations as a proxy for structural load", () => {
    const signal = interpret(result({ operacoesDeLeitura: ["segurar_sujeito_longo", "integrar_entre_frases"] }));
    expect(signal.operacoes).toEqual(["segurar_sujeito_longo", "integrar_entre_frases"]);
  });
});

describe("StubComprehensionProbe — deterministic", () => {
  it("returns the excerpt's fixture; pessimistic default outside it", async () => {
    const probe = new StubComprehensionProbe({ "trecho A": result({ podeResponder: true }) });
    expect((await probe.probe({ trecho: "trecho A", pergunta: "?" })).podeResponder).toBe(true);
    expect((await probe.probe({ trecho: "desconhecido", pergunta: "?" })).podeResponder).toBe(false);
  });

  it("same input → same output", async () => {
    const probe = new StubComprehensionProbe({});
    const a = await probe.probe({ trecho: "x", pergunta: "?" });
    const b = await probe.probe({ trecho: "x", pergunta: "?" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
