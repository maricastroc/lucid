import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localePtBR } from "@/locales/pt-BR";
import { localeEnUS } from "@/locales/en-US";
import { REGISTRY_EN } from "@/locales/en-US/datasets/registry";
import { metaFor } from "@/app/lib/criteria";
import { detectedProse } from "@/app/lib/narrative";

const acronyms = (text: string) =>
  analyzeWithLocale(text, localeEnUS).findings.filter((f) => f.criterion === "undefined_acronym");

describe("en-US undefined_acronym — what one finding carries", () => {
  it("flags the first undefined use only, and asks for a human", () => {
    const found = acronyms("The OMB guidance applies. Ask OMB if you are unsure.");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("OMB");
    expect(found[0].meta).toEqual({ acronym: "OMB" });
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].normativeReference).toEqual({ standard: "ISO 24495-1", section: "5.3.2" });
  });

  it("a definition that comes after the first use does not excuse the first use", () => {
    const found = acronyms("The FAA will review it. The Federal Aviation Administration (FAA) is responsible.");
    expect(found.map((f) => f.span.start)).toEqual([4]);
  });

  it("a plural acronym is keyed by its singular", () => {
    expect(acronyms("Keep copies of all SSNs you list.")[0].meta).toEqual({ acronym: "SSN" });
  });

  it("the known list only excuses: every entry is labelled by where it came from", () => {
    const lex = REGISTRY_EN.getPrepared<{ known: ReadonlySet<string>; fromGuidelines: readonly string[] }>(
      "acronyms.en",
    );
    expect(lex.fromGuidelines).toEqual(["IBM", "ATM", "BMW", "CIA"]);
    for (const acronym of lex.fromGuidelines) expect(lex.known.has(acronym)).toBe(true);
  });
});

describe("en-US undefined_acronym — shares a concept with pt-BR, not its data", () => {
  it("both catalogues resolve to the same canonical id", () => {
    expect(localePtBR.criteria.canonical?.sigla_sem_expansao).toBe("undefined_acronym");
  });

  it("a Brazilian acronym list does not excuse anything in English", () => {
    expect(acronyms("The INSS and the IBGE sent the data.").map((f) => f.meta?.acronym)).toEqual(["INSS", "IBGE"]);
  });

  it("the English presentation cites the English source in both interface languages", () => {
    const [f] = acronyms("The FAA denied the request.");
    expect(metaFor("en-US", "undefined_acronym", "pt-BR").label).toBe("Sigla sem expansão");
    expect(metaFor("en-US", "undefined_acronym", "en").label).toBe("Undefined acronym");
    expect(detectedProse(f, "en-US", "pt-BR")).toMatch(/diretrizes federais americanas/);
    expect(detectedProse(f, "en-US", "en")).toMatch(/Federal Aviation Administration \(FAA\)/);
  });
});
