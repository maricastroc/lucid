"use client";

import { useMemo } from "react";
import { countPii } from "@/lucid";
import { useCopy } from "../i18n/use-copy";
import { ShieldAlertIcon } from "./icons";

export function SendNotice({ text }: { text: string }) {
  const { c } = useCopy();
  const t = c.send;
  const found = useMemo(() => countPii(text), [text]);

  const parts = found.map((entry) => t.kinds[entry.kind](entry.count));
  const named =
    parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(t.join)}${t.lastJoin}${parts[parts.length - 1]}`;
  const alert = found.length > 0;

  return (
    <div
      className={`mt-3 flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${
        alert ? "border border-sev-warn/40 bg-sev-warn/10" : "border border-rule-2"
      }`}
    >
      <ShieldAlertIcon
        className="mt-px size-4 shrink-0"
        style={{ color: alert ? "var(--sev-warn)" : "var(--ink-3)" }}
      />
      <div className="min-w-0">
        <p className="text-[12px] leading-relaxed" style={alert ? { color: "var(--sev-warn)" } : undefined}>
          {alert && <strong className="font-semibold">{t.found(named)} </strong>}
          {t.always}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{t.limit}</p>
      </div>
    </div>
  );
}
