import { describe, expect, it } from "vitest";
import {
  activeSectionAt,
  anchorLine,
  buildPanelSections,
  collapsibleSections,
  PANEL_SECTION_IDS,
  sectionBodyId,
  sectionDomId,
  sectionHeadingId,
  type SectionOffset,
} from "../src/app/lib/panel-sections";
import { COPY } from "../src/app/i18n/copy";

const c = COPY["pt-BR"];
const en = COPY.en;

describe("panel sections — what the nav offers", () => {
  it("lists the audit hierarchy in order: state, findings, then the secondary sections", () => {
    const sections = buildPanelSections({ findingCount: 16, hasProbe: true }, c);
    expect(sections.map((s) => s.id)).toEqual(["summary", "findings", "settings", "metrics", "probe"]);
  });

  it("only the findings entry carries a count — the number has to mean something", () => {
    const sections = buildPanelSections({ findingCount: 16, hasProbe: true }, c);
    expect(sections.map((s) => s.count)).toEqual([undefined, 16, undefined, undefined, undefined]);
  });

  it("keeps the findings count at zero rather than dropping it (an empty index is a state)", () => {
    const sections = buildPanelSections({ findingCount: 0, hasProbe: true }, c);
    expect(sections.find((s) => s.id === "findings")?.count).toBe(0);
  });

  it("omits the probe when the surface does not render it — never a link that goes nowhere", () => {
    const sections = buildPanelSections({ findingCount: 3, hasProbe: false }, c);
    expect(sections.map((s) => s.id)).toEqual(["summary", "findings", "settings", "metrics"]);
  });

  it("summary and findings never collapse; the secondary sections do", () => {
    const sections = buildPanelSections({ findingCount: 3, hasProbe: true }, c);
    expect(collapsibleSections(sections)).toEqual(["settings", "metrics", "probe"]);
  });

  it("labels every section in both interface languages", () => {
    for (const id of PANEL_SECTION_IDS) {
      expect(c.panel.sections[id].length).toBeGreaterThan(0);
      expect(en.panel.sections[id].length).toBeGreaterThan(0);
    }
  });

  it("derives distinct, stable DOM ids for the section, its heading and its body", () => {
    expect(sectionDomId("findings")).toBe("painel-findings");
    expect(sectionHeadingId("findings")).toBe("painel-findings-titulo");
    expect(sectionBodyId("findings")).toBe("painel-findings-corpo");
    const ids = PANEL_SECTION_IDS.flatMap((id) => [sectionDomId(id), sectionHeadingId(id), sectionBodyId(id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("panel sections — which section is being read", () => {
  const offsets: readonly SectionOffset[] = [
    { id: "summary", top: 0 },
    { id: "findings", top: 400 },
    { id: "settings", top: 1600 },
    { id: "metrics", top: 1650 },
    { id: "probe", top: 1700 },
  ];
  const viewport = 760;
  const content = 1760;

  it("returns null when there is nothing to navigate", () => {
    expect(activeSectionAt([], 0, viewport, content)).toBeNull();
  });

  it("starts on the first section", () => {
    expect(activeSectionAt(offsets, 0, viewport, content)).toBe("summary");
  });

  it("holds the first section until the next one crosses the anchor line", () => {
    const line = anchorLine(viewport);
    expect(activeSectionAt(offsets, 400 - line - 1, viewport, content)).toBe("summary");
    expect(activeSectionAt(offsets, 400 - line, viewport, content)).toBe("findings");
  });

  it("keeps the long findings section active while the reader scrolls through it", () => {
    expect(activeSectionAt(offsets, 800, viewport, content)).toBe("findings");
  });

  it("activates the last section at the bottom, even though short sections never reach the line", () => {
    expect(activeSectionAt(offsets, content - viewport, viewport, content)).toBe("probe");
  });

  it("never skips ahead: the active section only advances as the reader scrolls down", () => {
    let seen = 0;
    for (let scrollTop = 0; scrollTop <= content - viewport; scrollTop += 10) {
      const active = activeSectionAt(offsets, scrollTop, viewport, content);
      const index = offsets.findIndex((o) => o.id === active);
      expect(index).toBeGreaterThanOrEqual(seen);
      seen = index;
    }
    expect(seen).toBe(offsets.length - 1);
  });

  it("scales the anchor line down on a short viewport instead of using a fixed band", () => {
    expect(anchorLine(760)).toBe(96);
    expect(anchorLine(240)).toBe(60);
  });

  it("stays on the first section when the whole panel fits on screen (a clean document)", () => {
    const short: readonly SectionOffset[] = [
      { id: "summary", top: 0 },
      { id: "findings", top: 30 },
      { id: "metrics", top: 120 },
    ];
    expect(activeSectionAt(short, 0, 400, 400)).toBe("summary");
  });

  it("still reaches the last section at the bottom of a viewport barely taller than the content", () => {
    const offsets: readonly SectionOffset[] = [
      { id: "summary", top: 0 },
      { id: "findings", top: 300 },
    ];
    expect(activeSectionAt(offsets, 200, 400, 600)).toBe("findings");
  });
});
