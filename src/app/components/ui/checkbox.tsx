"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "../icons";

export function Checkbox({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border border-rule-3 bg-sheet transition-colors duration-150 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <RadixCheckbox.Indicator className="text-accent-ink">
        <CheckIcon className="h-3 w-3" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
