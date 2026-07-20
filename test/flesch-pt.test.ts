import { describe, expect, it } from "vitest";
import { calcularFleschPt } from "../src/lucid/core/metrics/flesch-pt";

describe("calcularFleschPt — fórmula de Martins et al. (1996)", () => {
  it("usa a constante 248.835 (não a inglesa 206.835) quando as médias são zero", () => {
    expect(calcularFleschPt(0, 0)).toBe(248.835);
  });

  it("calcula corretamente para valores conhecidos", () => {
    // 248.835 - 1.015*5 - 84.6*1.8 = 248.835 - 5.075 - 152.28 = 91.48
    expect(calcularFleschPt(5, 1.8)).toBeCloseTo(91.48, 10);
  });

  it("é sensível a palavras/frase (mais palavras por frase reduz o índice)", () => {
    const curto = calcularFleschPt(5, 1.5);
    const longo = calcularFleschPt(30, 1.5);
    expect(longo).toBeLessThan(curto);
  });

  it("é sensível a sílabas/palavra (mais sílabas por palavra reduz o índice)", () => {
    const simples = calcularFleschPt(10, 1.5);
    const complexo = calcularFleschPt(10, 3.5);
    expect(complexo).toBeLessThan(simples);
  });

  it("não faz nenhum arredondamento (função pura, sem casas decimais fixas)", () => {
    const resultado = calcularFleschPt(7, 1.666666);
    const esperadoBruto = 248.835 - 1.015 * 7 - 84.6 * 1.666666;
    expect(resultado).toBe(esperadoBruto);
  });
});
