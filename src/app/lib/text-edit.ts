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
