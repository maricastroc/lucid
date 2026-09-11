import { describe, expect, it } from "vitest";
import { analyzeWithLocale, type Finding } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";
import { REGISTRY_EN } from "@/locales/en-US/datasets/registry";
import { matchLeadingCase } from "@/app/lib/text-edit";
import { isSafe, metaFor } from "@/app/lib/criteria";
import { buildConfidence, detectedProse } from "@/app/lib/narrative";
import { swapCopyFor } from "@/app/presentation/registry";

const hidden = (text: string) =>
  analyzeWithLocale(text, localeEnUS).findings.filter((f) => f.criterion === "hidden_verb");

function applySwaps(text: string, findings: readonly Finding[]): string {
  let out = text;
  for (const f of [...findings].sort((a, b) => b.span.start - a.span.start)) {
    if (!isSafe(f)) continue;
    out = out.slice(0, f.span.start) + matchLeadingCase(f.span.text, f.suggestion!) + out.slice(f.span.end);
  }
  return out;
}

describe("en-US hidden_verb — the curated half names a verb only where the source attests it", () => {
  it("the Federal guidelines' own example is uncovered exactly as the guidelines uncover it", () => {
    const text =
      "If you cannot make the payment of the $100 fee, you must make an application in writing before you file your tax return.";
    const found = hidden(text);
    expect(found.map((f) => [f.span.text, f.suggestion])).toEqual([
      ["make the payment of", "pay"],
      ["make an application", "apply"],
    ]);
    expect(applySwaps(text, found)).toBe(
      "If you cannot pay the $100 fee, you must apply in writing before you file your tax return.",
    );
  });

  it("the calculation example is uncovered exactly as well", () => {
    const text = "This means we must undertake the calculation of new figures for the congressional hearing.";
    expect(applySwaps(text, hidden(text))).toBe(
      "This means we must calculate new figures for the congressional hearing.",
    );
  });

  it("the review example gives a grammatical sentence, one word away from the guidelines' own rewrite", () => {
    const text =
      "To trace the missing payment, we need to carry out a review of the Agency’s accounts so we can gain an understanding of the reason the error occurred.";
    expect(applySwaps(text, hidden(text))).toBe(
      "To trace the missing payment, we need to review the Agency’s accounts so we can understand the reason the error occurred.",
    );
  });

  it("an inflected light verb keeps the attested verb in the explanation, but offers no swap", () => {
    const [f] = hidden("We made an application last year.");
    expect(f.meta).toMatchObject({ curated: true, swap: false, verb: "apply", lightForm: "made" });
    expect(f.suggestion).toBeUndefined();
    expect(f.requiresHuman).toBe(true);
    expect(f.justification).toMatch(/does not inflect verbs/);
  });

  it("a modifier or another determiner blocks the swap — the rule still flags, without naming a verb", () => {
    for (const text of ["You must make a formal application.", "You must make this payment."]) {
      const [f] = hidden(text);
      expect(f.meta, text).toMatchObject({ productive: true, curated: false, swap: false });
      expect(f.suggestion, text).toBeUndefined();
    }
  });

  it("the productive half never names a verb and always asks for a human", () => {
    const [f] = hidden("We will make a decision within 30 days.");
    expect(f.meta).toMatchObject({ productive: true, curated: false, suffix: "sion" });
    expect(f.meta?.verb).toBeUndefined();
    expect(f.suggestion).toBeUndefined();
    expect(f.requiresHuman).toBe(true);
  });

  it("every attested pair carries its source, and there is no pair without one", () => {
    const lexicon = REGISTRY_EN.getPrepared<{ attested: ReadonlyMap<string, { source: string }> }>("hidden-verb.en");
    expect(lexicon.attested.size).toBe(5);
    for (const entry of lexicon.attested.values()) expect(entry.source).toMatch(/Federal Plain Language Guidelines/);
  });
});

describe("en-US hidden_verb — presented as its own criterion", () => {
  const [swap] = hidden("You must make an application in writing.");
  const [productive] = hidden("We will make a decision within 30 days.");

  it("labels and explains the English phenomenon in both interface languages", () => {
    expect(metaFor("en-US", "hidden_verb", "pt-BR").label).toBe("Verbo escondido em substantivo");
    expect(metaFor("en-US", "hidden_verb", "en").label).toBe("Hidden verb");
    expect(detectedProse(swap, "en-US", "pt-BR")).toMatch(/Federal Plain Language Guidelines/);
    expect(detectedProse(productive, "en-US", "en")).toMatch(/does not name the verb/);
  });

  it("only the attested swap is presented as safe", () => {
    expect(isSafe(swap)).toBe(true);
    expect(buildConfidence(swap, "en-US", "pt-BR").level).toBe("segura");
    expect(isSafe(productive)).toBe(false);
    expect(buildConfidence(productive, "en-US", "pt-BR").level).toBe("assistida");
  });

  it("pt-BR has no hidden_verb criterion of its own — its phenomenon keeps its own id", () => {
    expect(metaFor("pt-BR", "hidden_verb", "pt-BR").kind).toBe("");
    expect(localeEnUS.criteria.canonical?.hidden_verb).toBeUndefined();
  });
});

describe("en-US hidden_verb — the swap card names its real source", () => {
  it("says the pair is attested in the guidelines, never that it came from a glossary", () => {
    expect(swapCopyFor("en-US", "hidden_verb", "pt-BR")?.source).toMatch(/FPLG 2011, p\. 23/);
    expect(swapCopyFor("en-US", "hidden_verb", "en")?.source).not.toMatch(/glossary/);
    expect(swapCopyFor("en-US", "hidden_verb", "en")?.applyNote).toMatch(/base form/);
    expect(swapCopyFor("pt-BR", "jargon", "pt-BR")).toBeNull();
    expect(swapCopyFor("en-US", "organization_vocabulary", "en")).toBeNull();
  });
});
