"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function PrintReport({ html, onPrinted }: { html: string; onPrinted: () => void }) {
  const opened = useRef(false);

  useEffect(() => {
    window.addEventListener("afterprint", onPrinted);
    if (!opened.current) {
      opened.current = true;
      window.print();
    }
    return () => window.removeEventListener("afterprint", onPrinted);
  }, [onPrinted]);

  return createPortal(
    <div id="relatorio-impresso" dangerouslySetInnerHTML={{ __html: html }} />,
    document.body,
    "relatorio-impresso",
  );
}
