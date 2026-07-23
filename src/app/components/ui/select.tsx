"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { ArrowDownIcon, CheckIcon } from "../icons";

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rule-2 bg-sheet px-2.5 py-2 text-[12.5px] text-ink-1 outline-none transition-colors duration-150 hover:bg-surface-2 data-[state=open]:border-rule-3"
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ArrowDownIcon className="h-3 w-3 text-ink-3" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-lg border border-rule-2 bg-sheet text-[12.5px] text-ink-1 shadow-(--shadow-pop)"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 outline-none data-[highlighted]:bg-surface-2 data-[state=checked]:font-medium data-[state=checked]:text-ink-0"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <CheckIcon className="h-3 w-3 text-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
