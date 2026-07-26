import { describe, expect, it } from "vitest";
import { analyzeWithLocale, createAnalyzer } from "../src/lucid/core/analyzer";
import { localePtBR } from "../src/locales/pt-BR";
import { testLocale } from "./support/test-locale";

describe("locale boundary — architecture", () => {
  it("the neutral analyzer accepts the SYNTHETIC locale (no English) and uses its fake metric", () => {
    const d = analyzeWithLocale("foo bar baz. qux foo.", testLocale);

    expect(d.findings.map((f) => f.span.text)).toEqual(["foo", "bar", "foo"]);
    expect(d.findings.every((f) => f.criterion === "test_marker")).toBe(true);

    expect(d.metrics.fleschPt).toBe(42);

    expect(d.meta.localeId).toBe("test-LOCALE");
    expect(d.meta.standardVersion).toBe("TEST-STD");
  });

  it("the synthetic locale does NOT detect pt-BR criteria (independent pass sets)", () => {
    const text = "Foi realizada a análise pela comissão.";
    const synthetic = analyzeWithLocale(text, testLocale);
    const ptBR = analyzeWithLocale(text, localePtBR);
    expect(synthetic.findings).toEqual([]);
    expect(ptBR.findings.length).toBeGreaterThan(0);
  });

  it("two analyzers from different locales coexist with no shared state", () => {
    const pt = createAnalyzer({ locale: localePtBR });
    const tl = createAnalyzer({ locale: testLocale });
    const text = "foo. Foi realizada a análise pela comissão.";

    const pt1 = pt.analyze(text);
    const tl1 = tl.analyze(text);
    const pt2 = pt.analyze(text);
    const tl2 = tl.analyze(text);

    expect(pt.localeId).toBe("pt-BR");
    expect(tl.localeId).toBe("test-LOCALE");
    expect(pt2).toEqual(pt1);
    expect(tl2).toEqual(tl1);
    expect(pt1.meta.localeId).toBe("pt-BR");
    expect(tl1.meta.localeId).toBe("test-LOCALE");
  });

  it("the registries are independent: each locale's dataHash reflects only its own datasets", () => {
    const pt = analyzeWithLocale("Qualquer texto.", localePtBR);
    const tl = analyzeWithLocale("Qualquer texto.", testLocale);
    expect(pt.meta.dataHash).not.toBe(tl.meta.dataHash);
    expect(analyzeWithLocale("Qualquer texto.", testLocale).meta.dataHash).toBe(tl.meta.dataHash);
  });
});
