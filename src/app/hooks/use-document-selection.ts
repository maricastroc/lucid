"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export interface DocumentSelection {
  excerpt: string;
  clear: () => void;
}

export function useDocumentSelection(containerRef: RefObject<HTMLElement | null>): DocumentSelection {
  const [excerpt, setExcerpt] = useState("");

  useEffect(() => {
    const onSelectionChange = () => {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;
      const text = selection.toString().trim();
      if (text !== "") setExcerpt(text);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [containerRef]);

  const clear = useCallback(() => setExcerpt(""), []);

  return { excerpt, clear };
}
