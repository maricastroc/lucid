"use client";

import { useCopy } from "../../i18n/use-copy";
import { MinusIcon, PlusIcon } from "../icons";

interface Props {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}

export function Stepper({ value, min, max, label, onChange }: Props) {
  const { c } = useCopy();
  const clamp = (next: number) => Math.min(Math.max(Math.trunc(next), min), max);
  const step = (delta: number) => onChange(clamp(value + delta));

  return (
    <div className="inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-lg border border-rule-2 bg-sheet">
      <button
        type="button"
        aria-label={c.profile.decrease(label)}
        disabled={value <= min}
        onClick={() => step(-1)}
        className="grid w-7 place-items-center text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0 disabled:cursor-not-allowed disabled:text-ink-dim disabled:hover:bg-transparent"
      >
        <MinusIcon className="size-3.5" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
        className="u-no-spinner w-10 border-x border-rule-1 bg-transparent text-center text-[13px] tabular-nums text-ink-0 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent"
      />

      <button
        type="button"
        aria-label={c.profile.increase(label)}
        disabled={value >= max}
        onClick={() => step(1)}
        className="grid w-7 place-items-center text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0 disabled:cursor-not-allowed disabled:text-ink-dim disabled:hover:bg-transparent"
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}
