import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { interpretFleschPt } from "../src/locales/pt-BR/readability/flesch-pt";
import { countSyllables } from "../src/locales/pt-BR/services/syllables";
import { describeReadability } from "../src/app/lib/readability";
import type { ReadabilityReading } from "../src/lucid";

const read = (text: string): ReadabilityReading => interpretFleschPt(analyze(text).metrics);

/** A real legalese period from §1: 44 words in one sentence, a LEGITIMATELY negative Flesch-PT. */
const JURIDIQUES =
  "Fica assegurado ao interessado, na hipótese de indeferimento do requerimento formulado perante a autoridade " +
  "competente, o direito de interposição de recurso administrativo, no prazo improrrogável de dez dias contados da " +
  "data da respectiva ciência, sem prejuízo das demais medidas judiciais eventualmente cabíveis na espécie.";

describe("readability interpretation — never alters the measured value", () => {
  it("there is NO clamp: a value above 100 is preserved, with the position alongside", () => {
    const r = read("Eu fui.");
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBe(162.2);
    expect(r.position).toBe("above_range");
    expect(r.band).toBeNull();
  });

  it("a negative value from REAL text is a valid measurement, not an anomaly — the distinction a clamp would erase", () => {
    const r = read(JURIDIQUES);
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBeLessThan(0);
    expect(r.position).toBe("below_range");
    expect(r.anomalies).toEqual([]);
  });

  it("a value inside the range gets a band with a label and bounds", () => {
    const r = read("O gato subiu no telhado. O cão dormiu no sofá. A casa ficou quieta. Todos foram dormir cedo.");
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.position).toBe("in_range");
    expect(r.band).not.toBeNull();
    expect(r.band!.min).toBeLessThanOrEqual(r.value);
    expect(r.band!.label.length).toBeGreaterThan(0);
  });
});

describe("causes of a missing measurement — explicit, never generic", () => {
  it("text with no word returns `no_words` (and the value is null, not 0)", () => {
    const d = analyze("!!! ??? ...");
    expect(d.metrics.fleschPt).toBeNull();
    expect(interpretFleschPt(d.metrics)).toEqual({ kind: "unmeasurable", cause: "no_words" });
  });

  it("empty text returns `no_words`", () => {
    expect(read("")).toEqual({ kind: "unmeasurable", cause: "no_words" });
  });

  it("the copy for the missing measurement says it is not zero", () => {
    const display = describeReadability(read(""));
    expect(display.value).toBe("—");
    expect(display.notes.join(" ")).toContain("não é zero");
  });
});

describe("measurement anomalies — each one named, with magnitude and threshold", () => {
  it("`syllables_per_word_impossible`: a syllable average above the arithmetically possible maximum", () => {
    const r = read(`${"aeiou".repeat(100)}.`);
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBeLessThan(-1000);
    const anomaly = r.anomalies.find((a) => a.cause === "syllables_per_word_impossible");
    expect(anomaly).toBeDefined();
    expect(anomaly).toMatchObject({ cause: "syllables_per_word_impossible", threshold: 20 });
  });

  it("the 20 syllables/word threshold has a hard basis: the longest word in PT counts 18", () => {
    expect(countSyllables("pneumoultramicroscopicossilicovulcanoconiótico")).toBe(18);

    const r = read("pneumoultramicroscopicossilicovulcanoconiótico.");
    if (r.kind !== "measured") throw new Error("expected a measurement");
    expect(r.anomalies.some((a) => a.cause === "syllables_per_word_impossible")).toBe(false);
  });

  it("`sentence_boundary_missing`: 300 words with no punctuation become a single sentence", () => {
    const r = read(Array(300).fill("palavra").join(" "));
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    const anomaly = r.anomalies.find((a) => a.cause === "sentence_boundary_missing");
    expect(anomaly).toMatchObject({ cause: "sentence_boundary_missing", wordsPerSentence: 300, threshold: 100 });
    expect(describeReadability(r).notes.join(" ")).toContain("fronteira de frase");
  });

  it("`small_sample`: below 20 words the average is dominated by a single token", () => {
    const r = read("Eu fui.");
    if (r.kind !== "measured") throw new Error("expected a measurement");
    expect(r.anomalies).toContainEqual({ cause: "small_sample", words: 2, threshold: 20 });
  });

  it("the empirical basis for the sample threshold: one word moves the index by 29 points", () => {
    const two = read("Eu fui.");
    const three = read("Ele é bom.");
    if (two.kind !== "measured" || three.kind !== "measured") throw new Error("expected a measurement");

    expect(two.value).toBe(162.2);
    expect(three.value).toBe(133);
    expect(Math.round(two.value - three.value)).toBe(29);
  });

  it("ordinary running text gets no anomaly at all", () => {
    const r = read(JURIDIQUES);
    if (r.kind !== "measured") throw new Error("expected a measurement");
    expect(r.anomalies).toEqual([]);
  });

  it("anomalies come out in a FIXED order (input degeneration before sample size)", () => {
    const r = read(`${"aeiou".repeat(100)}.`);
    if (r.kind !== "measured") throw new Error("expected a measurement");
    expect(r.anomalies.map((a) => a.cause)).toEqual(["syllables_per_word_impossible", "small_sample"]);
  });
});

describe("interpretation determinism", () => {
  it("same input, identical reading (the interpretation is as pure as Layer 1)", () => {
    for (const text of ["Eu fui.", JURIDIQUES, "", `${"aeiou".repeat(100)}.`]) {
      expect(read(text)).toEqual(read(text));
      expect(describeReadability(read(text))).toEqual(describeReadability(read(text)));
    }
  });

  it("there is no approval variant in the reading — only value, position and cause", () => {
    const r = read(JURIDIQUES);
    expect(Object.keys(r).sort()).toEqual(["anomalies", "band", "kind", "position", "value"]);
    expect(JSON.stringify(r)).not.toContain("approved");
  });
});
