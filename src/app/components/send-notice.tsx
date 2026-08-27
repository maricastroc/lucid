"use client";

import { useMemo } from "react";
import { countPii } from "@/lucid";
import { useCopy } from "../i18n/use-copy";

export function SendNotice({ text, destination }: { text: string; destination: string }) {
  const { c } = useCopy();
  const t = c.send;
  const found = useMemo(() => countPii(text), [text]);

  const parts = found.map((entry) => t.kinds[entry.kind](entry.count));
  const named =
    parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(t.join)}${t.lastJoin}${parts[parts.length - 1]}`;

  return (
    <div
      className={
        found.length > 0
          ? "mt-3 rounded-lg border border-sev-warn/40 bg-sev-warn/10 px-3 py-2.5"
          : "mt-3 rounded-lg border border-rule-2 px-3 py-2.5"
      }
    >
      <p
        className="text-[12px] leading-relaxed"
        style={found.length > 0 ? { color: "var(--sev-warn)" } : undefined}
      >
        {found.length > 0 && <strong className="font-semibold">{t.found(named)} </strong>}
        {t.always(destination)}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">{t.limit}</p>
    </div>
  );
}
