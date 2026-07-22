/**
 * Densidade de subordinação (`subordinacao_densa`, 5.3.4). Conta conectivos subordinativos por
 * frase (léxico curado + matcher de frase contígua) como proxy de "orações por frase". Precisão >
 * recall: só conectivos inequívocos contam; os polissêmicos (que/se/como/caso…) NÃO — o piso
 * honesto é subestimar, nunca exagerar.
 */
import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "../src/lucid";

function subordinacaoFindings(text: string): Finding[] {
  return analyze(text).findings.filter((f) => f.criterion === "subordinacao_densa");
}

describe("subordinacao_densa — dispara na densidade, não no conectivo isolado", () => {
  it("3 subordinadores na mesma frase → 1 finding (passage) por frase, warning + requiresHuman", () => {
    const text =
      "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    const [f, ...rest] = subordinacaoFindings(text);
    expect(rest).toHaveLength(0);
    expect(f).toBeDefined();
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.span.text).toBe(text);
    expect(f.meta?.clauses).toBe(3);
  });

  it("2 subordinadores (abaixo do limiar 3) → não dispara", () => {
    const text = "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou.";
    expect(subordinacaoFindings(text)).toHaveLength(0);
  });
});

describe("subordinacao_densa — locuções contam como uma oração cada", () => {
  it("locuções multipalavra (para que / desde que / uma vez que) contam", () => {
    const text =
      "Para que o pedido avance, desde que haja verba, uma vez que o setor aprove, o processo segue.";
    const found = subordinacaoFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });

  it("locução com crase (à medida que) é reconhecida", () => {
    const text =
      "À medida que os prazos correm, para que o setor aja, desde que haja verba, o pedido avança.";
    const found = subordinacaoFindings(text);
    expect(found).toHaveLength(1);
    expect(found[0].meta?.clauses).toBe(3);
  });
});

describe("subordinacao_densa — precisão: polissêmicos NÃO contam", () => {
  it("'que' relativo, 'se' e 'caso' (substantivo) não inflam a contagem", () => {
    const text =
      "O documento que foi assinado, o caso que analisamos e o recurso que segue, se possível, vão em anexo.";
    expect(subordinacaoFindings(text)).toHaveLength(0);
  });
});

describe("subordinacao_densa — desligável e determinística", () => {
  it("mesma entrada → mesma saída (byte a byte no span/among)", () => {
    const text =
      "Embora o prazo tenha vencido, o pedido avança porque o sistema falhou, ainda que o gestor recuse.";
    expect(subordinacaoFindings(text)).toEqual(subordinacaoFindings(text));
  });
});
