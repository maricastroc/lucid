"use client";

import type { PanelSection, PanelSectionId } from "../lib/panel-sections";
import { sectionDomId } from "../lib/panel-sections";
import { useCopy } from "../i18n/use-copy";

interface Props {
  sections: readonly PanelSection[];
  activeId: PanelSectionId | null;
  onGo: (id: PanelSectionId) => void;
}

export function PanelNav({ sections, activeId, onGo }: Props) {
  const { c } = useCopy();
  return (
    <nav aria-label={c.panel.navLabel} className="shrink-0 border-b border-rule-1 bg-surface px-3.5">
      <ul className="flex flex-wrap items-center gap-x-3">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onGo(section.id)}
                aria-current={active ? "true" : undefined}
                aria-controls={sectionDomId(section.id)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-[12px] font-medium transition-colors duration-150 ${
                  active
                    ? "border-accent text-ink-0"
                    : "border-transparent text-ink-2 hover:border-rule-3 hover:text-ink-0"
                }`}
              >
                {section.label}
                {section.count !== undefined && (
                  <span className={`tabular-nums ${active ? "text-ink-2" : "text-ink-3"}`}>{section.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
