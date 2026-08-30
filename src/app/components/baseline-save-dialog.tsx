"use client";

import { useState } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { useCopy } from "../i18n/use-copy";
import { Button } from "./ui/button";

export function BaselineSaveDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => void;
}) {
  const { c } = useCopy();
  const b = c.baseline;
  const [title, setTitle] = useState("");
  const ready = title.trim() !== "";

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTitle("");
        onOpenChange(next);
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fade-in fixed inset-0 z-50 bg-ink-0/25 backdrop-blur-[2px]" />
        <RadixDialog.Content className="rise fixed left-1/2 top-1/2 z-50 flex max-h-[min(38rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-pop) outline-none">
          <div className="shrink-0 px-6 pt-6">
            <RadixDialog.Title className="font-serif text-[19px] leading-snug tracking-[-0.008em] text-ink-0">
              {b.dialogTitle}
            </RadixDialog.Title>
            <RadixDialog.Description className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">
              {b.dialogLead}
            </RadixDialog.Description>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <label className="mt-4 block">
              <span className="block text-[12.5px] font-medium text-ink-1">{b.titleLabel}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{b.titleHint}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={b.titlePlaceholder}
                aria-label={b.titleLabel}
                className="mt-1.5 w-full rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[13px] text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
              />
            </label>

            <p
              role="note"
              className="mt-4 rounded-lg border border-rule-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-2"
            >
              {b.fileNotice}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 px-6 pb-6 pt-5">
            <Button
              variant="primary"
              size="xl"
              shape="pill"
              disabled={!ready}
              onClick={() => {
                onSave(title.trim());
                setTitle("");
                onOpenChange(false);
              }}
            >
              {b.save}
            </Button>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="xl" shape="pill">
                {c.common.cancel}
              </Button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
