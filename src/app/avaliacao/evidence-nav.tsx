"use client";

import { useEffect, useState } from "react";

export interface NavSection {
  readonly id: string;
  readonly label: string;
}

const STRIP = 64;

export function EvidenceNav({ sections }: { sections: readonly NavSection[] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setCurrent(sections[sections.length - 1]?.id ?? null);
        return;
      }

      let reading: string | null = null;
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= STRIP) reading = section.id;
      }
      setCurrent(reading);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Seções da avaliação"
      className="sticky top-0 z-10 border-b border-rule-2 bg-sheet/95 backdrop-blur-sm"
    >
      <ul className="flex gap-1 overflow-x-auto px-6 py-2 sm:px-14 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => {
          const active = current === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={active ? "location" : undefined}
                className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active ? "bg-surface-3 text-ink-0" : "text-ink-1 hover:bg-surface-2 hover:text-ink-0"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
