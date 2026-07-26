import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";

const cohesionOf = (text: string) => analyze(text).metrics.cohesion;

describe("lexical referential cohesion (ADR-061)", () => {
  it("sentences repeating content words have high overlap and zero gap", () => {
    const c = cohesionOf("O prazo do documento é curto. O documento tem prazo definido.");
    expect(c.referentialOverlap).toBeGreaterThan(0);
    expect(c.adjacentGapRatio).toBe(0);
  });

  it("sentences sharing no content word at all have full gap and zero overlap", () => {
    const c = cohesionOf("O gato dorme tranquilo. Aviões cruzam céus distantes.");
    expect(c.referentialOverlap).toBe(0);
    expect(c.adjacentGapRatio).toBe(1);
  });

  it("plural/singular count as continuity (reuses normalize-number)", () => {
    const c = cohesionOf("Os documentos chegaram hoje. O documento foi arquivado.");
    expect(c.adjacentGapRatio).toBe(0);
  });

  it("a document with fewer than 2 sentences: overlap and gap are 0 (no pairs)", () => {
    const c = cohesionOf("Uma frase só aqui.");
    expect(c.referentialOverlap).toBe(0);
    expect(c.adjacentGapRatio).toBe(0);
  });
});

describe("connectives by class (ADR-061)", () => {
  it("classifies connectives and counts them per class", () => {
    const c = cohesionOf("O pedido foi negado. Portanto, o prazo encerra. No entanto, cabe recurso porque há prazo.");
    expect(c.connectivesByClass.conclusive).toBeGreaterThanOrEqual(1);
    expect(c.connectivesByClass.adversative).toBeGreaterThanOrEqual(1);
    expect(c.connectivesByClass.causal).toBeGreaterThanOrEqual(1);
    expect(c.connectivesPer100Words).toBeGreaterThan(0);
  });

  it("multi-word takes priority (uma vez que = 1 causal, 'que' is not counted separately)", () => {
    const c = cohesionOf("Uma vez que o prazo venceu, o pedido caiu.");
    expect(c.connectivesByClass.causal).toBe(1);
  });

  it("'e'/'ou' are deliberately excluded (they would inflate the count)", () => {
    const c = cohesionOf("O gato e o cão e o rato ou o pássaro.");
    expect(c.connectivesPer100Words).toBe(0);
  });
});

describe("cohesion — does NOT enter the scorecard (Metric only)", () => {
  it("no finding uses cohesion metrics; they live in metrics.cohesion", () => {
    const d = analyze("Portanto, o prazo encerra. No entanto, cabe recurso.");
    expect(d.metrics.cohesion).toBeDefined();

    expect(JSON.stringify(d.score)).not.toContain("cohesion");
    expect(JSON.stringify(d.score)).not.toContain("referential");
  });
});
