"use client";

import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { useCopy } from "../../i18n/use-copy";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = "destructive",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "destructive" | "accent";
}) {
  const { c } = useCopy();

  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fade-in fixed inset-0 z-50 bg-ink-0/25 backdrop-blur-[2px]" />
        <RadixAlertDialog.Content className="rise fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rule-1 bg-sheet p-6 shadow-(--shadow-pop) outline-none">
          <RadixAlertDialog.Title className="font-serif text-[19px] leading-snug tracking-[-0.008em] text-ink-0">
            {title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
            {body}
          </RadixAlertDialog.Description>

          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <RadixAlertDialog.Cancel asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-rule-2 px-4 py-2 text-[13px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0"
              >
                {cancelLabel ?? c.common.cancel}
              </button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  tone === "destructive"
                    ? "inline-flex items-center justify-center rounded-full border border-sev-error/45 bg-sev-error/10 px-4 py-2 text-[13px] font-semibold text-sev-error transition-colors duration-150 hover:bg-sev-error/18"
                    : "inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink shadow-(--shadow-card) transition-colors duration-150 hover:bg-accent-strong"
                }
              >
                {confirmLabel}
              </button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
