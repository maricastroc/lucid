"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  activeSectionAt,
  collapsibleSections,
  sectionDomId,
  sectionHeadingId,
  type PanelSection,
  type PanelSectionId,
  type SectionOffset,
} from "../lib/panel-sections";

export interface PanelSectionNav {
  activeId: PanelSectionId | null;
  isOpen: (id: PanelSectionId) => boolean;
  toggle: (id: PanelSectionId) => void;
  goTo: (id: PanelSectionId) => void;
}

function offsetWithin(scroller: HTMLElement, el: HTMLElement): number {
  return el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

export function usePanelSections(
  sections: readonly PanelSection[],
  scrollRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): PanelSectionNav {
  const collapsibleIds = useMemo(() => collapsibleSections(sections), [sections]);
  const [open, setOpen] = useState<ReadonlySet<PanelSectionId>>(() => new Set());
  const [activeId, setActiveId] = useState<PanelSectionId | null>(sections[0]?.id ?? null);

  const pendingScroll = useRef<PanelSectionId | null>(null);
  const scrollAnchor = useRef<{ id: PanelSectionId; viewportTop: number } | null>(null);
  const [navTick, setNavTick] = useState(0);

  const find = useCallback(
    (id: PanelSectionId): HTMLElement | null => scrollRef.current?.querySelector(`#${sectionDomId(id)}`) ?? null,
    [scrollRef],
  );

  const measure = useCallback((): readonly SectionOffset[] => {
    const scroller = scrollRef.current;
    if (!scroller) return [];
    const offsets: SectionOffset[] = [];
    for (const section of sections) {
      const el = find(section.id);
      if (el) offsets.push({ id: section.id, top: offsetWithin(scroller, el) });
    }
    return offsets;
  }, [sections, scrollRef, find]);

  const sync = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    setActiveId(activeSectionAt(measure(), scroller.scrollTop, scroller.clientHeight, scroller.scrollHeight));
  }, [measure, scrollRef]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!enabled || !scroller) return;

    const onScroll = () => sync();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(scroller);
    sync();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [enabled, scrollRef, sync]);

  useEffect(() => {
    if (enabled) sync();
  }, [enabled, open, sections, sync]);

  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    scrollAnchor.current = null;
    const scroller = scrollRef.current;
    if (!anchor || !scroller) return;
    const el = find(anchor.id);
    if (!el) return;
    const now = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    scroller.scrollTop += now - anchor.viewportTop;
  }, [open, scrollRef, find]);

  useEffect(() => {
    const id = pendingScroll.current;
    pendingScroll.current = null;
    const scroller = scrollRef.current;
    if (id === null || !scroller) return;
    const el = find(id);
    if (!el) return;
    scroller.querySelector<HTMLElement>(`#${sectionHeadingId(id)}`)?.focus({ preventScroll: true });

    scroller.scrollTop = offsetWithin(scroller, el);
    setActiveId(id);

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const settled = find(id);
        if (settled) scroller.scrollTop = offsetWithin(scroller, settled);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [navTick, scrollRef, find]);

  const rememberAnchor = useCallback(
    (id: PanelSectionId) => {
      const scroller = scrollRef.current;
      const el = find(id);
      if (!scroller || !el) return;
      scrollAnchor.current = {
        id,
        viewportTop: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
      };
    },
    [scrollRef, find],
  );

  const toggle = useCallback(
    (id: PanelSectionId) => {
      rememberAnchor(id);
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [rememberAnchor],
  );

  const goTo = useCallback(
    (id: PanelSectionId) => {
      if (collapsibleIds.includes(id)) setOpen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      pendingScroll.current = id;
      setNavTick((tick) => tick + 1);
    },
    [collapsibleIds],
  );

  const isOpen = useCallback(
    (id: PanelSectionId) => !collapsibleIds.includes(id) || open.has(id),
    [collapsibleIds, open],
  );

  return { activeId, isOpen, toggle, goTo };
}
