"use client";

import { useCallback, useState } from "react";

export interface HighlightVisibility {
  hiddenHighlights: ReadonlySet<string>;
  toggleHighlights: (criterion: string) => void;
}

export function useHighlightVisibility(): HighlightVisibility {
  const [hiddenHighlights, setHidden] = useState<ReadonlySet<string>>(() => new Set());

  const toggleHighlights = useCallback((criterion: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });
  }, []);

  return { hiddenHighlights, toggleHighlights };
}
