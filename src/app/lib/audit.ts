import type { Finding } from "@/lucid";

export function applySafeSuggestions(text: string, findings: readonly Finding[]): string {
  const safe = findings
    .filter((f) => f.suggestion !== undefined)
    .sort((a, b) => b.span.start - a.span.start);

  let result = text;
  let boundary = Infinity;
  for (const f of safe) {
    if (f.span.end > boundary) continue;
    result = result.slice(0, f.span.start) + f.suggestion + result.slice(f.span.end);
    boundary = f.span.start;
  }
  return result;
}
