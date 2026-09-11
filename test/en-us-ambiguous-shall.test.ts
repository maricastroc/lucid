import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";
import { REGISTRY_EN } from "@/locales/en-US/datasets/registry";
import { metaFor, provenanceLabel } from "@/app/lib/criteria";
import { buildConfidence, detectedProse } from "@/app/lib/narrative";

const analyze = (text: string) => analyzeWithLocale(text, localeEnUS);
const shalls = (text: string) => analyze(text).findings.filter((f) => f.criterion === "ambiguous_shall");

describe("en-US ambiguous_shall — flags the word, never picks the reading (unit tests only)", () => {
  it("flags every 'shall', asks for a human and offers no replacement", () => {
    const [f] = shalls("The applicant shall file an application.");
    expect(f.span.text).toBe("shall");
    expect(f.meta).toEqual({ negated: false });
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.justification).toMatch(/does not pick the reading/);
  });

  it("reads the negation into the span, because 'shall not' has other readings", () => {
    const [f] = shalls("The lessee shall not remove timber.");
    expect(f.span.text).toBe("shall not");
    expect(f.meta).toEqual({ negated: true });
    expect(f.justification).toMatch(/“must not” for a prohibition/);
    expect(shalls("You shan't be charged.")[0].meta).toEqual({ negated: true });
  });

  it("counts each occurrence, including questions", () => {
    expect(shalls("Shall I call you? The agency shall answer, and the owner shall pay.")).toHaveLength(3);
  });

  it("does not match inside other words or flag 'must'", () => {
    expect(shalls("The Marshall office said you must file the form.")).toEqual([]);
  });

  it("is an English editorial extension: it cites no ISO clause", () => {
    const [f] = shalls("The lessee shall pay.");
    expect(f.source).toBe("editorial");
    expect(f.normativeReference).toBeUndefined();
    expect(provenanceLabel(f, "en", "en-US")).toMatch(/EN-US/);
  });

  it("co-occurs with the reader named in the third person, each under its own criterion", () => {
    const d = analyze(
      "Any oil or gas lessee who wishes to use timber for fuel in drilling operations shall file an application " +
        "with the officer who issued the lease.",
    );
    expect(d.findings.map((f) => f.criterion).sort()).toEqual(
      expect.arrayContaining(["ambiguous_shall", "reader_in_third_person"]),
    );
  });

  it("every reading it names carries its source, and 'will' is labelled as Lucid's own note", () => {
    const lex = REGISTRY_EN.getPrepared<{ readings: readonly { plain: string; source: string }[] }>("shall.en");
    for (const r of lex.readings) expect(r.source.length).toBeGreaterThan(10);
    expect(lex.readings.find((r) => r.plain === "will")?.source).toMatch(/^Lucid note/);
  });
});

describe("en-US ambiguous_shall — English only", () => {
  const [f] = shalls("The lessee shall pay.");

  it("exists only in the en-US presentation", () => {
    expect(metaFor("en-US", "ambiguous_shall", "pt-BR").label).toBe("“Shall” ambíguo");
    expect(metaFor("en-US", "ambiguous_shall", "en").label).toBe("Ambiguous “shall”");
    expect(metaFor("pt-BR", "ambiguous_shall", "pt-BR").kind).toBe("");
  });

  it("the presentation lists the readings and never claims a safe swap", () => {
    expect(detectedProse(f, "en-US", "pt-BR")).toMatch(/“must”.*“may”.*“should”/);
    expect(buildConfidence(f, "en-US", "en").level).toBe("assistida");
  });
});
