import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localePtBR } from "@/locales/pt-BR";
import { localeEnUS } from "@/locales/en-US";
import { metaFor } from "@/app/lib/criteria";
import { detectedProse, detectionHeadline } from "@/app/lib/narrative";

const readers = (text: string) =>
  analyzeWithLocale(text, localeEnUS).findings.filter((f) => f.criterion === "reader_in_third_person");

describe("en-US reader_in_third_person — what one finding carries", () => {
  it("runs from the reader's noun phrase to the modal, and always asks for a human", () => {
    const [f] = readers("Each taxpayer should keep a copy of the return.");
    expect(f.span.text).toBe("Each taxpayer should");
    expect(f.meta).toEqual({ readerNoun: "taxpayer", deontic: "should" });
    expect(f.requiresHuman).toBe(true);
    expect(f.severity).toBe("info");
    expect(f.suggestion).toBeUndefined();
  });

  it("reads a deontic phrase to its last word, across coordinated reader nouns", () => {
    const [f] = readers("Lessees and operators are responsible for restoring the site.");
    expect(f.span.text).toBe("Lessees and operators are responsible for");
    expect(f.meta?.deontic).toBe("are responsible for");
  });

  it("never crosses 'you' or 'we': a text that already speaks to the reader is left alone", () => {
    expect(readers("If you are the lessee, you must monitor the operator.")).toEqual([]);
    expect(readers("We review each application, and applicants we contact must reply.")).toEqual([]);
  });

  it("the reader as object of a preposition or of a verb is not the subject the rule reads", () => {
    expect(readers("Send the form to the applicant, who must sign it.")).toEqual([]);
    expect(readers("We will notify the applicant.")).toEqual([]);
  });
});

describe("en-US reader_in_third_person — shares a concept with pt-BR, not a presentation", () => {
  const [f] = readers("Applicants must submit Form 12 by May 1.");

  it("both catalogues resolve to the same canonical id", () => {
    expect(localePtBR.criteria.canonical?.leitor_terceira_pessoa).toBe("reader_in_third_person");
    expect(localeEnUS.criteria.ids).toContain("reader_in_third_person");
  });

  it("the English presentation names English roles and modals, in both interface languages", () => {
    expect(metaFor("en-US", "reader_in_third_person", "pt-BR").signal).toMatch(/applicant/);
    expect(metaFor("en-US", "reader_in_third_person", "en").signal).toMatch(/must, shall/);
    expect(detectionHeadline(f, "en-US", "pt-BR")).toMatch(/Applicants/);
    expect(detectedProse(f, "en-US", "pt-BR")).toMatch(/“you”/);
    expect(detectedProse(f, "en-US", "en")).not.toMatch(/você/);
  });
});
