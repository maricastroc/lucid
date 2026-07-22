/**
 * Testes ARQUITETURAIS da fronteira de locale (ADR-031) — provam a fronteira, não o caminho feliz:
 *   · a arquitetura neutra aceita outro locale (o sintético) sem adicionar inglês;
 *   · dois analyzers de locales diferentes coexistem sem estado compartilhado;
 *   · nenhum registry global vaza entre instâncias;
 *   · o resultado carrega a identidade do locale (`meta.localeId`).
 * A cerca "core não importa locale" + pureza de `locales/**` é provada por `boundary.test.ts`
 * (dependency-cruiser).
 */
import { describe, expect, it } from "vitest";
import { analyzeWithLocale, createAnalyzer } from "../src/lucid/core/analyzer";
import { localePtBR } from "../src/locales/pt-BR";
import { testLocale } from "./support/test-locale";

describe("fronteira de locale — arquitetura", () => {
  it("o analyzer neutro aceita o locale SINTÉTICO (sem inglês) e usa a métrica falsa dele", () => {
    const d = analyzeWithLocale("foo bar baz. qux foo.", testLocale);

    expect(d.findings.map((f) => f.span.text)).toEqual(["foo", "bar", "foo"]);
    expect(d.findings.every((f) => f.criterion === "test_marker")).toBe(true);

    expect(d.metrics.fleschPt).toBe(42);

    expect(d.meta.localeId).toBe("test-LOCALE");
    expect(d.meta.standardVersion).toBe("TEST-STD");
  });

  it("o locale sintético NÃO detecta os critérios do pt-BR (conjuntos de passes independentes)", () => {
    const texto = "Foi realizada a análise pela comissão.";
    const sintetico = analyzeWithLocale(texto, testLocale);
    const ptBR = analyzeWithLocale(texto, localePtBR);
    expect(sintetico.findings).toEqual([]);
    expect(ptBR.findings.length).toBeGreaterThan(0);
  });

  it("dois analyzers de locales diferentes coexistem sem estado compartilhado", () => {
    const pt = createAnalyzer({ locale: localePtBR });
    const tl = createAnalyzer({ locale: testLocale });
    const texto = "foo. Foi realizada a análise pela comissão.";

    const pt1 = pt.analyze(texto);
    const tl1 = tl.analyze(texto);
    const pt2 = pt.analyze(texto);
    const tl2 = tl.analyze(texto);

    expect(pt.localeId).toBe("pt-BR");
    expect(tl.localeId).toBe("test-LOCALE");
    expect(pt2).toEqual(pt1);
    expect(tl2).toEqual(tl1);
    expect(pt1.meta.localeId).toBe("pt-BR");
    expect(tl1.meta.localeId).toBe("test-LOCALE");
  });

  it("os registries são independentes: o dataHash de cada locale reflete só os seus datasets", () => {
    const pt = analyzeWithLocale("Qualquer texto.", localePtBR);
    const tl = analyzeWithLocale("Qualquer texto.", testLocale);
    expect(pt.meta.dataHash).not.toBe(tl.meta.dataHash);
    expect(analyzeWithLocale("Qualquer texto.", testLocale).meta.dataHash).toBe(tl.meta.dataHash);
  });
});
