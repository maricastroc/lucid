"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { stepView, viewTabId, type AuditView, type AuditViewId } from "../lib/audit-views";

export type ReviewMode = "route" | "browse";

export interface AuditViewNav {
  readonly view: AuditViewId;
  readonly reviewMode: ReviewMode;
  goTo: (id: AuditViewId) => void;
  onTabKeyDown: (event: React.KeyboardEvent) => void;
  setReviewMode: (mode: ReviewMode) => void;
  goToRoute: () => void;
}

export function useAuditView(views: readonly AuditView[], scrollRef: RefObject<HTMLDivElement | null>): AuditViewNav {
  const [view, setView] = useState<AuditViewId>("overview");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("route");
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = 0;
  }, [view, scrollRef]);

  const goTo = useCallback((id: AuditViewId) => {
    moved.current = true;
    setView(id);
  }, []);

  const goToRoute = useCallback(() => {
    moved.current = true;
    setReviewMode("route");
    setView("review");
  }, []);

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (delta === 0) return;
      event.preventDefault();
      const next = stepView(views, view, delta);
      goTo(next);
      document.getElementById(viewTabId(next))?.focus();
    },
    [views, view, goTo],
  );

  return { view, reviewMode, goTo, onTabKeyDown, setReviewMode, goToRoute };
}
