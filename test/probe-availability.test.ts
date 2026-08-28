import { describe, expect, it } from "vitest";
import { buildPanelSections, PANEL_SECTION_IDS } from "../src/app/lib/panel-sections";
import { PROBE_SECTION_ENABLED } from "../src/app/lib/probe-availability";
import { COPY } from "../src/app/i18n/copy";
import { GOLDEN_SONDA } from "./eval/probe-golden";

const c = COPY["pt-BR"];

describe("comprehension probe — hidden from production until the meta-eval clears (ADR-090)", () => {
  it("stays disabled: flipping this on is a decision that owes a passing live meta-eval", () => {
    expect(PROBE_SECTION_ENABLED).toBe(false);
  });

  it("the audit panel offers no comprehension section, even where the surface can render one", () => {
    for (const hasProbe of [true, false]) {
      const sections = buildPanelSections({ findingCount: 5, hasProbe }, c);
      expect(sections.map((s) => s.id)).not.toContain("probe");
    }
  });

  it("hiding the section is the ONLY gate — the surface still declares it can host the probe", () => {
    const offered = buildPanelSections({ findingCount: 5, hasProbe: true }, c);
    const notOffered = buildPanelSections({ findingCount: 5, hasProbe: false }, c);
    expect(offered.map((s) => s.id)).toEqual(notOffered.map((s) => s.id));
  });

  it("nothing was deleted: the section id and its copy survive in both interface languages", () => {
    expect(PANEL_SECTION_IDS).toContain("probe");
    expect(COPY["pt-BR"].panel.sections.probe.length).toBeGreaterThan(0);
    expect(COPY.en.panel.sections.probe.length).toBeGreaterThan(0);
    expect(COPY["pt-BR"].probe.title.length).toBeGreaterThan(0);
  });

  it("the evidence that condemned it stays runnable: the labelled golden set is intact", () => {
    expect(GOLDEN_SONDA.length).toBeGreaterThanOrEqual(27);
    expect(GOLDEN_SONDA.some((g) => g.humanoTrava)).toBe(true);
    expect(GOLDEN_SONDA.some((g) => !g.humanoTrava)).toBe(true);
  });
});
