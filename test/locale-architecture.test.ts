import { describe, expect, it } from "vitest";
import { analyzeWithLocale, createAnalyzer } from "../src/lucid/core/analyzer";
import { localePtBR } from "../src/locales/pt-BR";
import { readabilityReadingOf } from "../src/lucid";
import { describeReadability } from "../src/app/lib/readability";
import { metricLessLocale, testLocale } from "./support/test-locale";

describe("locale boundary — architecture", () => {
  it("the neutral analyzer accepts the SYNTHETIC locale (no English) and uses its fake metric", () => {
    const d = analyzeWithLocale("foo bar baz. qux foo.", testLocale);

    expect(d.findings.map((f) => f.span.text)).toEqual(["foo", "bar", "foo"]);
    expect(d.findings.every((f) => f.criterion === "test_marker")).toBe(true);

    expect(d.metrics.readability).toBe(42);

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

describe("locale boundary — a locale may decline to offer a metric", () => {
  const text = "Foo bar baz qux. Bar foo baz.";

  it("no readability service: the value is null, never zero", () => {
    const d = analyzeWithLocale(text, metricLessLocale);
    expect(d.metrics.readability).toBeNull();
    expect(d.metrics.readability).not.toBe(0);
  });

  it("no syllable service: syllable counts are null, never zero", () => {
    const d = analyzeWithLocale(text, metricLessLocale);
    expect(d.metrics.syllables).toBeNull();
    expect(d.metrics.syllablesPerWord).toBeNull();
  });

  it("what the locale DOES count is still counted", () => {
    const d = analyzeWithLocale(text, metricLessLocale);
    expect(d.metrics.words).toBe(7);
    expect(d.metrics.sentences).toBe(2);
    expect(d.metrics.wordsPerSentence).toBe(3.5);
  });

  it("an empty document under a metric-less locale keeps null, not zero", () => {
    const d = analyzeWithLocale("", metricLessLocale);
    expect(d.metrics.syllables).toBeNull();
    expect(d.metrics.syllablesPerWord).toBeNull();
    expect(d.metrics.readability).toBeNull();
  });

  it("`unavailable` is a different reading from `unmeasurable`", () => {
    const absent = readabilityReadingOf(undefined, analyzeWithLocale(text, metricLessLocale).metrics);
    const empty = readabilityReadingOf(localePtBR.metrics.readability, analyzeWithLocale("", localePtBR).metrics);

    expect(absent).toEqual({ kind: "unavailable" });
    expect(empty).toEqual({ kind: "unmeasurable", cause: "no_words" });
  });

  it("the interface renders `unavailable` as a dash with a reason, never as a measured zero", () => {
    const shown = describeReadability({ kind: "unavailable" });
    expect(shown.measured).toBe(false);
    expect(shown.value).toBe("—");
    expect(shown.value).not.toBe("0");
    expect(shown.qualifier.length).toBeGreaterThan(0);
    expect(shown.notes[0].length).toBeGreaterThan(0);
  });

  it("pt-BR is untouched: it still offers both services", () => {
    const d = analyzeWithLocale(text, localePtBR);
    expect(d.metrics.readability).not.toBeNull();
    expect(d.metrics.syllables).not.toBeNull();
    expect(d.metrics.syllablesPerWord).not.toBeNull();
  });
});
