"use client";

import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { useCopy } from "../i18n/use-copy";
import type { AnalysisLocaleId } from "../locale/active";
import { localeSwitchItems, type LocaleSwitchDiscard } from "../locale/switch";
import { Button } from "./ui/button";

export function LocaleSwitchDialog({
  target,
  discard,
  onConfirm,
  onCancel,
}: {
  target: AnalysisLocaleId | null;
  discard: LocaleSwitchDiscard;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { c } = useCopy();
  const a = c.analysisLocale;

  return (
    <RadixAlertDialog.Root
      open={target !== null}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fade-in fixed inset-0 z-50 bg-ink-0/25 backdrop-blur-[2px]" />
        <RadixAlertDialog.Content className="rise fixed left-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rule-1 bg-sheet p-6 shadow-(--shadow-pop) outline-none">
          <RadixAlertDialog.Title className="font-serif text-[19px] leading-snug tracking-[-0.008em] text-ink-0">
            {target === null ? "" : a.switchDialog.title(a.name[target] ?? target)}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
            {a.switchDialog.lead}
          </RadixAlertDialog.Description>

          <ul className="mt-3 space-y-1.5">
            {localeSwitchItems(discard, c).map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink-1">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-sev-warn" />
                {item}
              </li>
            ))}
          </ul>

          <p
            role="note"
            className="mt-4 rounded-lg border border-rule-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2"
          >
            {a.switchDialog.kept}
          </p>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <RadixAlertDialog.Cancel asChild>
              <Button variant="outline" size="xl" shape="pill" className="whitespace-nowrap">
                {a.switchDialog.cancel}
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button variant="danger" size="xl" shape="pill" className="whitespace-nowrap" onClick={onConfirm}>
                {a.switchDialog.confirm}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
