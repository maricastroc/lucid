"use client";

import { useState } from "react";
import { ChevronDownIcon } from "../icons";

export function Disclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-5 border-t border-rule-1 pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="focus-inset row-hit flex w-full items-center gap-2 rounded-md py-1 text-left"
      >
        <ChevronDownIcon
          className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
        />
        <span className="u-sublabel text-ink-3">{label}</span>
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
