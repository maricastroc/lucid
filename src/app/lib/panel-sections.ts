import type { UiCopy } from "../i18n/copy";

export const PANEL_SECTION_IDS = ["summary", "findings", "settings", "metrics", "probe"] as const;

export type PanelSectionId = (typeof PANEL_SECTION_IDS)[number];

export interface PanelSection {
  readonly id: PanelSectionId;
  readonly label: string;
  readonly count?: number;
  readonly collapsible: boolean;
}

export interface PanelSectionInput {
  readonly findingCount: number;
  readonly hasProbe: boolean;
}

export const sectionDomId = (id: PanelSectionId): string => `painel-${id}`;
export const sectionHeadingId = (id: PanelSectionId): string => `painel-${id}-titulo`;
export const sectionBodyId = (id: PanelSectionId): string => `painel-${id}-corpo`;

export function buildPanelSections(input: PanelSectionInput, c: UiCopy): readonly PanelSection[] {
  const sections: PanelSection[] = [
    { id: "summary", label: c.panel.sections.summary, collapsible: false },
    { id: "findings", label: c.panel.sections.findings, count: input.findingCount, collapsible: false },
    { id: "settings", label: c.panel.sections.settings, collapsible: true },
    { id: "metrics", label: c.panel.sections.metrics, collapsible: true },
  ];
  if (input.hasProbe) sections.push({ id: "probe", label: c.panel.sections.probe, collapsible: true });
  return sections;
}

export const collapsibleSections = (sections: readonly PanelSection[]): readonly PanelSectionId[] =>
  sections.filter((s) => s.collapsible).map((s) => s.id);

const ANCHOR_MAX = 96;
const ANCHOR_RATIO = 0.25;

export const anchorLine = (viewportHeight: number): number => Math.min(ANCHOR_MAX, viewportHeight * ANCHOR_RATIO);

export interface SectionOffset {
  readonly id: PanelSectionId;
  readonly top: number;
}

export function activeSectionAt(
  offsets: readonly SectionOffset[],
  scrollTop: number,
  viewportHeight: number,
  scrollHeight: number,
): PanelSectionId | null {
  if (offsets.length === 0) return null;
  if (scrollHeight - viewportHeight <= 1) return offsets[0].id;
  if (scrollTop + viewportHeight >= scrollHeight - 2) return offsets[offsets.length - 1].id;

  const line = scrollTop + anchorLine(viewportHeight);
  let active = offsets[0].id;
  for (const offset of offsets) {
    if (offset.top <= line) active = offset.id;
  }
  return active;
}
