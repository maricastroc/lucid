import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localePtBR } from "@/locales/pt-BR";
import { EN_DEFAULT_CONFIG, localeEnUS } from "@/locales/en-US";
import { analysisLocale } from "@/app/locale/active";
import { knobsFor } from "@/app/lib/profile";
import { metaFor } from "@/app/lib/criteria";
import { detectedProse } from "@/app/lib/narrative";
import { thresholdNoteFor } from "@/app/presentation/registry";

const enumerations = (text: string, overrides?: Parameters<typeof analyzeWithLocale<typeof EN_DEFAULT_CONFIG>>[2]) =>
  analyzeWithLocale(text, localeEnUS, overrides).findings.filter((f) => f.criterion === "prose_enumeration");

describe("en-US prose_enumeration — three notations, one threshold", () => {
  it("reads a series after a colon, ignoring commas inside parentheses", () => {
    const [f] = enumerations(
      "Provide the following: the depth of the well, the circulation media (mud, air or foam), and the site layout.",
    );
    expect(f.meta).toMatchObject({ items: 3, notation: "series", threshold: 3, thresholdStatus: "provisional" });
    expect(f.span.text).toBe("the depth of the well, the circulation media (mud, air or foam), and the site layout");
  });

  it("reads markers and ordinals across a paragraph, once per paragraph", () => {
    const [markers] = enumerations("You must (1) register, (2) pay the fee, and (3) attend the hearing.");
    expect(markers.meta).toMatchObject({ items: 3, notation: "markers" });
    expect(markers.justification).toMatch(/“\(1\)… \(2\)… \(3\)…”/);
    const found = enumerations("First, read the notice. Second, fill out the form. Third, mail it to us.");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ items: 3, notation: "ordinals" });
  });

  it("the threshold is configurable, and moving it moves what is found", () => {
    const text = "Bring two things: your ID and your lease.";
    expect(enumerations(text)).toEqual([]);
    expect(enumerations(text, { proseEnumeration: { enabled: true, minItems: 2 } })).toHaveLength(1);
    expect(enumerations(text, { proseEnumeration: { enabled: false, minItems: 2 } })).toEqual([]);
  });

  it("never converts: it asks for a human and offers no text", () => {
    const [f] = enumerations("Bring these documents: a photo ID, proof of address, and your lease.");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.normativeReference).toEqual({ standard: "ISO 24495-1", section: "5.2.3" });
  });
});

describe("en-US prose_enumeration — same id as pt-BR, its own detection and presentation", () => {
  it("the pt-BR detector does not read English colon series, and the English one reads them", () => {
    const text = "Bring these documents: a photo ID, proof of address, and your lease.";
    expect(analyzeWithLocale(text, localePtBR).findings.filter((f) => f.criterion === "prose_enumeration")).toEqual([]);
    expect(enumerations(text)).toHaveLength(1);
  });

  it("each locale keeps its own threshold field, under the same knob label", () => {
    const en = knobsFor(analysisLocale("en-US")).find((k) => k.criterion === "prose_enumeration");
    const pt = knobsFor(analysisLocale("pt-BR")).find((k) => k.criterion === "prose_enumeration");
    expect(en).toMatchObject({ field: "minItems", basis: { status: "provisional" } });
    expect(pt).toMatchObject({ field: "minMarkers", basis: { status: "product-parameter" } });
    expect(thresholdNoteFor("en-US", "proseEnumeration", "minItems", "pt-BR")).toMatch(/provisório/);
    expect(thresholdNoteFor("pt-BR", "proseEnumeration", "minMarkers", "pt-BR")).toBeNull();
  });

  it("the English presentation describes the English notations in both interface languages", () => {
    const [f] = enumerations("Bring these documents: a photo ID, proof of address, and your lease.");
    expect(metaFor("en-US", "prose_enumeration", "pt-BR").signal).toMatch(/dois-pontos/);
    expect(metaFor("pt-BR", "prose_enumeration", "pt-BR").signal).not.toMatch(/dois-pontos/);
    expect(detectedProse(f, "en-US", "en")).toMatch(/colon/);
  });
});
