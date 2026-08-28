"use client";

import { useRef, type KeyboardEvent, type RefObject } from "react";

export interface ListRovingFocus {
  /** Goes on the container that holds the rows. */
  ref: RefObject<HTMLDivElement | null>;
  onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Up and down walk the rows of the index without the reader having to tab through the mark and
 * dismiss buttons of every row on the way. Rows are found by `data-row` rather than by component,
 * so the list can be recomposed without the keys changing meaning.
 */
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
