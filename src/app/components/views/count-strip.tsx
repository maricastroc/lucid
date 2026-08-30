"use client";

import type { ReviewRoute } from "../../lib/review-route";
import { useCopy } from "../../i18n/use-copy";

export function CountStrip({ route, className = "" }: { route: ReviewRoute; className?: string }) {
  const { c } = useCopy();
  const n = c.counts;

  const cells = [
    { key: "pending", value: route.pending, noun: n.noun.pending(route.pending), strong: true },
    { key: "reviewed", value: route.reviewed, noun: n.noun.reviewed(route.reviewed), strong: false },
    { key: "dismissed", value: route.dismissed, noun: n.noun.dismissed(route.dismissed), strong: false },
  ];

  return (
    <div role="group" aria-label={n.stripLabel} className={className}>
      <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
        {cells.map((cell) => (
          <div key={cell.key} className="flex items-baseline gap-1.5">
            <dd
              className={`order-1 text-[13px] font-semibold tabular-nums ${cell.strong ? "text-ink-0" : "text-ink-1"}`}
            >
              {cell.value}
            </dd>
            <dt className="order-2 text-[11.5px] text-ink-2">{cell.noun}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
