import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";

const cohesionOf = (text: string) => analyze(text).metrics.cohesion;

describe("coesão referencial lexical (ADR-061)", () => {
  it("frases que repetem palavras de conteúdo têm sobreposição alta e gap zero", () => {
    const c = cohesionOf("O prazo do documento é curto. O documento tem prazo definido.");
    expect(c.referentialOverlap).toBeGreaterThan(0);
    expect(c.adjacentGapRatio).toBe(0);
  });

  it("frases sem nenhuma palavra de conteúdo em comum têm gap total e sobreposição zero", () => {
    const c = cohesionOf("O gato dorme tranquilo. Aviões cruzam céus distantes.");
    expect(c.referentialOverlap).toBe(0);
    expect(c.adjacentGapRatio).toBe(1);
  });

  it("plural/singular contam como continuidade (reusa normalize-number)", () => {
    const c = cohesionOf("Os documentos chegaram hoje. O documento foi arquivado.");
    expect(c.adjacentGapRatio).toBe(0);
  });

  it("documento com menos de 2 frases: overlap e gap são 0 (sem pares)", () => {
    const c = cohesionOf("Uma frase só aqui.");
    expect(c.referentialOverlap).toBe(0);
    expect(c.adjacentGapRatio).toBe(0);
  });
});

describe("conectivos por classe (ADR-061)", () => {
  it("classifica conectivos e conta por classe", () => {
    const c = cohesionOf("O pedido foi negado. Portanto, o prazo encerra. No entanto, cabe recurso porque há prazo.");
    expect(c.connectivesByClass.conclusive).toBeGreaterThanOrEqual(1);
    expect(c.connectivesByClass.adversative).toBeGreaterThanOrEqual(1);
    expect(c.connectivesByClass.causal).toBeGreaterThanOrEqual(1);
    expect(c.connectivesPer100Words).toBeGreaterThan(0);
  });

  it("multi-palavra tem prioridade (uma vez que = 1 causal, não conta 'que' à parte)", () => {
    const c = cohesionOf("Uma vez que o prazo venceu, o pedido caiu.");
    expect(c.connectivesByClass.causal).toBe(1);
  });

  it("'e'/'ou' são deliberadamente excluídos (não inflam a contagem)", () => {
    const c = cohesionOf("O gato e o cão e o rato ou o pássaro.");
    expect(c.connectivesPer100Words).toBe(0);
  });
});

describe("coesão — NÃO entra no placar (só Metric)", () => {
  it("nenhum finding usa métricas de coesão; elas vivem em metrics.cohesion", () => {
    const d = analyze("Portanto, o prazo encerra. No entanto, cabe recurso.");
    expect(d.metrics.cohesion).toBeDefined();

    expect(JSON.stringify(d.score)).not.toContain("cohesion");
    expect(JSON.stringify(d.score)).not.toContain("referential");
  });
});
