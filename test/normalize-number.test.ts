import { describe, expect, it } from "vitest";
import { normalizeNumber } from "../src/locales/pt-BR/services/normalize-number";

describe("normalizeNumber — plural regular → singular (determinístico, conservador)", () => {
  it("plural regular em vogal + s", () => {
    expect(normalizeNumber("casas")).toBe("casa");
    expect(normalizeNumber("prazos")).toBe("prazo");
    expect(normalizeNumber("documentos")).toBe("documento");
    expect(normalizeNumber("benefícios")).toBe("benefício");
    expect(normalizeNumber("análises")).toBe("análise");
  });

  it("plural em -ões/-ães/-ãos → -ão", () => {
    expect(normalizeNumber("solicitações")).toBe("solicitação");
    expect(normalizeNumber("leões")).toBe("leão");
    expect(normalizeNumber("pães")).toBe("pão");
    expect(normalizeNumber("mãos")).toBe("mão");
  });

  it("plural em -ns → -m", () => {
    expect(normalizeNumber("bens")).toBe("bem");
    expect(normalizeNumber("homens")).toBe("homem");
    expect(normalizeNumber("nuvens")).toBe("nuvem");
  });

  it("idempotência: o singular volta igual", () => {
    for (const w of ["casa", "prazo", "documento", "benefício", "solicitação", "bem"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("NÃO corta singulares acentuados terminados em s (guarda de vogal não-acentuada)", () => {
    expect(normalizeNumber("país")).toBe("país");
    expect(normalizeNumber("mês")).toBe("mês");
    expect(normalizeNumber("após")).toBe("após");
    expect(normalizeNumber("através")).toBe("através");
  });

  it("NÃO corta singulares invariáveis em -s de alta frequência", () => {
    for (const w of ["lápis", "ônibus", "vírus", "pires", "status"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("NÃO funde palavras de raízes distintas", () => {
    expect(normalizeNumber("casamento")).toBe("casamento");
    expect(normalizeNumber("casas")).not.toBe(normalizeNumber("casamento"));
  });

  it("palavras curtas (≤3) ficam intactas", () => {
    for (const w of ["as", "os", "gás", "mes"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("sub-normalização deliberada: -es consonantal não vira raiz (flores↛flor), mas nunca funde lemas distintos", () => {
    expect(normalizeNumber("flores")).toBe("flore");
    expect(normalizeNumber("flor")).toBe("flor");
  });
});
