"use client";

import { useRef, type KeyboardEvent, type RefObject } from "react";

export interface ListRovingFocus {
  ref: RefObject<HTMLDivElement | null>;
  onKeyDown: (event: KeyboardEvent) => void;
}

export function useListRovingFocus(): ListRovingFocus {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    const i = rows.findIndex((r) => r === document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
    rows[next]?.focus();
  };

  return { ref, onKeyDown };
}
