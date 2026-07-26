import { describe, expect, it } from "vitest";
import { normalizeNumber } from "../src/locales/pt-BR/services/normalize-number";

describe("normalizeNumber — regular plural → singular (deterministic, conservative)", () => {
  it("regular plural in vowel + s", () => {
    expect(normalizeNumber("casas")).toBe("casa");
    expect(normalizeNumber("prazos")).toBe("prazo");
    expect(normalizeNumber("documentos")).toBe("documento");
    expect(normalizeNumber("benefícios")).toBe("benefício");
    expect(normalizeNumber("análises")).toBe("análise");
  });

  it("plural in -ões/-ães/-ãos → -ão", () => {
    expect(normalizeNumber("solicitações")).toBe("solicitação");
    expect(normalizeNumber("leões")).toBe("leão");
    expect(normalizeNumber("pães")).toBe("pão");
    expect(normalizeNumber("mãos")).toBe("mão");
  });

  it("plural in -ns → -m", () => {
    expect(normalizeNumber("bens")).toBe("bem");
    expect(normalizeNumber("homens")).toBe("homem");
    expect(normalizeNumber("nuvens")).toBe("nuvem");
  });

  it("idempotence: a singular comes back unchanged", () => {
    for (const w of ["casa", "prazo", "documento", "benefício", "solicitação", "bem"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("does NOT trim accented singulars ending in s (unaccented-vowel guard)", () => {
    expect(normalizeNumber("país")).toBe("país");
    expect(normalizeNumber("mês")).toBe("mês");
    expect(normalizeNumber("após")).toBe("após");
    expect(normalizeNumber("através")).toBe("através");
  });

  it("does NOT trim high-frequency invariant singulars in -s", () => {
    for (const w of ["lápis", "ônibus", "vírus", "pires", "status"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("does NOT merge words with distinct stems", () => {
    expect(normalizeNumber("casamento")).toBe("casamento");
    expect(normalizeNumber("casas")).not.toBe(normalizeNumber("casamento"));
  });

  it("short words (≤3) are left intact", () => {
    for (const w of ["as", "os", "gás", "mes"]) {
      expect(normalizeNumber(w)).toBe(w);
    }
  });

  it("deliberate under-normalization: consonantal -es does not reach the stem (flores↛flor), but distinct lemmas never merge", () => {
    expect(normalizeNumber("flores")).toBe("flore");
    expect(normalizeNumber("flor")).toBe("flor");
  });
});
