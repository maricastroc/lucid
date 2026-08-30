import type { UiCopy } from "../i18n/copy";
import { PROBE_SECTION_ENABLED } from "./probe-availability";

export const AUDIT_VIEW_IDS = ["overview", "review", "changes", "metrics", "probe"] as const;

export type AuditViewId = (typeof AUDIT_VIEW_IDS)[number];

export const isAuditViewId = (value: unknown): value is AuditViewId =>
  typeof value === "string" && (AUDIT_VIEW_IDS as readonly string[]).includes(value);

export interface ViewBadge {
  readonly value: number;
  readonly noun: string;
}

export interface AuditView {
  readonly id: AuditViewId;
  readonly label: string;
  readonly purpose: string;
  readonly badge: ViewBadge | null;
}

export interface AuditViewInput {
  readonly pending: number;
  readonly changes: number;
  readonly hasProbe: boolean;
}

export function buildAuditViews(input: AuditViewInput, c: UiCopy): readonly AuditView[] {
  const views: AuditView[] = [
    { id: "overview", label: c.views.overview.label, purpose: c.views.overview.purpose, badge: null },
    {
      id: "review",
      label: c.views.review.label,
      purpose: c.views.review.purpose,
      badge: input.pending > 0 ? { value: input.pending, noun: c.counts.noun.pendingPoints(input.pending) } : null,
    },
    {
      id: "changes",
      label: c.views.changes.label,
      purpose: c.views.changes.purpose,
      badge: input.changes > 0 ? { value: input.changes, noun: c.counts.noun.change(input.changes) } : null,
    },
    { id: "metrics", label: c.views.metrics.label, purpose: c.views.metrics.purpose, badge: null },
  ];

  if (input.hasProbe && PROBE_SECTION_ENABLED) {
    views.push({ id: "probe", label: c.views.probe.label, purpose: c.views.probe.purpose, badge: null });
  }
  return views;
}

export const viewTabId = (id: AuditViewId): string => `aba-${id}`;
export const viewPanelId = (id: AuditViewId): string => `painel-${id}`;
export const viewHeadingId = (id: AuditViewId): string => `painel-${id}-titulo`;

export function stepView(views: readonly AuditView[], from: AuditViewId, delta: number): AuditViewId {
  const at = views.findIndex((view) => view.id === from);
  if (at === -1 || views.length === 0) return from;
  return views[(at + delta + views.length) % views.length].id;
}
