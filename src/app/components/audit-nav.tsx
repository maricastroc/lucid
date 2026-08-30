"use client";

import type { AuditView, AuditViewId } from "../lib/audit-views";
import { viewPanelId, viewTabId } from "../lib/audit-views";
import { useCopy } from "../i18n/use-copy";

interface Props {
  views: readonly AuditView[];
  activeId: AuditViewId;
  onGo: (id: AuditViewId) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export function AuditNav({ views, activeId, onGo, onKeyDown }: Props) {
  const { c } = useCopy();
  return (
    <div
      role="tablist"
      aria-label={c.panel.navLabel}
      onKeyDown={onKeyDown}
      className="flex shrink-0 items-stretch gap-x-1 border-b border-rule-1 bg-surface px-3"
    >
      {views.map((view) => {
        const active = view.id === activeId;
        return (
          <button
            key={view.id}
            id={viewTabId(view.id)}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={viewPanelId(view.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onGo(view.id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-1.5 py-2.5 text-[12.5px] transition-colors duration-150 ${
              active
                ? "border-accent font-semibold text-ink-0"
                : "border-transparent font-medium text-ink-2 hover:border-rule-3 hover:text-ink-0"
            }`}
          >
            {view.label}
            {view.badge !== null && (
              <span
                title={`${view.badge.value} ${view.badge.noun}`}
                aria-label={`${view.badge.value} ${view.badge.noun}`}
                className={`rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums ${
                  active ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink-2"
                }`}
              >
                {view.badge.value}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
