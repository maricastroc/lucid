"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

export interface DismissableMenu {
  open: boolean;
  boxRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  toggle: () => void;
  close: (returnFocus: boolean) => void;
  setOpen: (open: boolean) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

export function useDismissableMenu(onClose?: () => void): DismissableMenu {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    onClose?.();
    if (returnFocus) triggerRef.current?.focus();
  };

  const toggle = () => (open ? close(false) : setOpen(true));

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    e.stopPropagation();
    const items = Array.from(boxRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
    const i = items.findIndex((item) => item === document.activeElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return { open, boxRef, triggerRef, toggle, close, setOpen, onKeyDown };
}
