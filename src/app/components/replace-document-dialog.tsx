"use client";

import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { useCopy } from "../i18n/use-copy";
import { atRiskItems, type PendingWork } from "../lib/pending-work";
import { Button } from "./ui/button";

export function ReplaceDocumentDialog({
  work,
  onSave,
  onDiscard,
  onCancel,
}: {
  work: PendingWork | null;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const { c } = useCopy();
  const r = c.studio.replaceDocument;

  return (
    <RadixAlertDialog.Root
      open={work !== null}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fade-in fixed inset-0 z-50 bg-ink-0/25 backdrop-blur-[2px]" />
        <RadixAlertDialog.Content className="rise fixed left-1/2 top-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rule-1 bg-sheet p-6 shadow-(--shadow-pop) outline-none">
          <RadixAlertDialog.Title className="font-serif text-[19px] leading-snug tracking-[-0.008em] text-ink-0">
            {r.title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
            {r.lead}
          </RadixAlertDialog.Description>

          {work !== null && (
            <ul className="mt-3 space-y-1.5">
              {atRiskItems(work, r).map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink-1">
                  <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-sev-warn" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <p
            role="note"
            className="mt-4 rounded-lg border border-rule-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2"
          >
            {r.saveHint} {r.kept}
          </p>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <RadixAlertDialog.Cancel asChild>
              <Button variant="ghost" size="xl" shape="pill" className="whitespace-nowrap">
                {r.cancel}
              </Button>
            </RadixAlertDialog.Cancel>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="danger" size="xl" shape="pill" className="whitespace-nowrap" onClick={onDiscard}>
                {r.discard}
              </Button>
              <Button variant="primary" size="xl" shape="pill" className="whitespace-nowrap" onClick={onSave}>
                {r.save}
              </Button>
            </div>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
