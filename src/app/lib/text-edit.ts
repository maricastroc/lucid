import type { Span } from "@/lucid";

export function spliceSpan(text: string, target: Span, replacement: string): string {
  return text.slice(0, target.start) + replacement + text.slice(target.end);
}

export function manualEditReplacement(draft: string): string {
  return draft.trim();
}

export function isManualEditDirty(original: string, draft: string): boolean {
  const next = manualEditReplacement(draft);
  return next.length > 0 && next !== original.trim();
}

export function matchLeadingCase(original: string, replacement: string): string {
  const first = original.trimStart()[0];
  const target = replacement[0];
  if (first === undefined || target === undefined) return replacement;
  if (first !== first.toUpperCase() || first === first.toLowerCase()) return replacement;
  if (target === target.toUpperCase()) return replacement;
  return target.toUpperCase() + replacement.slice(1);
}
