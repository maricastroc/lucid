"use client";

import { metaFor } from "../../lib/criteria";
import type { ReviewRoute } from "../../lib/review-route";
import { useCopy } from "../../i18n/use-copy";
import type { UiLang } from "../../i18n/types";
import { CheckIcon } from "../icons";

export function StepTrail({
  route,
  onGo,
  lang,
  size = "regular",
}: {
  route: ReviewRoute;
  onGo: (criterion: string) => void;
  lang: UiLang;
  size?: "regular" | "compact";
}) {
  const { c } = useCopy();
  const g = c.guided;
  const box = size === "compact" ? "size-5 text-[10px]" : "size-6 text-[11px]";
  const nextIndex = route.next?.index ?? -1;
  const openIndex = route.open?.index ?? -1;

  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={g.trailLabel}>
      {route.steps.map((step, i) => {
        const here = i === openIndex;
        const done = step.state === "done";
        const label = metaFor(step.criterion, lang).label;

        const tone = here
          ? "bg-accent text-accent-ink ring-2 ring-accent-line ring-offset-1 ring-offset-surface-2"
          : done
            ? "bg-safe-weak text-safe"
            : i === nextIndex
              ? "border border-accent-line bg-accent-weak text-accent"
              : "border border-rule-2 bg-transparent text-ink-3";

        const name = g.trailStep(i + 1, route.steps.length, label, c.route.states[step.state]);

        return (
          <li key={step.criterion}>
            <button
              type="button"
              onClick={() => onGo(step.criterion)}
              aria-current={here ? "step" : undefined}
              title={name}
              aria-label={name}
              className={`flex ${box} items-center justify-center rounded-md font-semibold tabular-nums transition-all duration-150 hover:brightness-105 ${tone}`}
            >
              {done ? <CheckIcon className="size-3" /> : i + 1}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
