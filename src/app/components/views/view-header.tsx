"use client";

import type { ReactNode } from "react";
import type { AuditViewId } from "../../lib/audit-views";
import { viewHeadingId } from "../../lib/audit-views";
import { CompassIcon, GaugeIcon, HistoryIcon, ListChecksIcon, ShieldAlertIcon } from "../icons";

const GLYPH: Record<AuditViewId, typeof CompassIcon> = {
  overview: CompassIcon,
  review: ListChecksIcon,
  changes: HistoryIcon,
  metrics: GaugeIcon,
  probe: ShieldAlertIcon,
};

export function ViewHeader({
  id,
  title,
  purpose,
  children,
}: {
  id: AuditViewId;
  title: string;
  purpose: string;
  children?: ReactNode;
}) {
  const Glyph = GLYPH[id];
  return (
    <header className="border-b border-rule-1 bg-surface px-4 pb-2.5 pt-3">
      <h2 id={viewHeadingId(id)} tabIndex={-1} className="u-label flex items-center gap-1.5 text-ink-2">
        <Glyph className="size-3.5 text-ink-3" />
        {title}
      </h2>
      <p className="mt-1 max-w-md text-[12px] leading-relaxed text-ink-2">{purpose}</p>
      {children}
    </header>
  );
}
