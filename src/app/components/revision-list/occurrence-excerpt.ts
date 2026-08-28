import type { Finding } from "@/lucid";

export const excerptOf = (f: Finding): string => f.span.text.replace(/\s+/g, " ").trim();

const CONTEXT_WORDS = 6;

export function contextAfter(text: string, finding: Finding): string {
  const tail = text.slice(finding.span.end, finding.span.end + 160).replace(/\s+/gu, " ").trim();
  if (tail === "") return "";
  const words = tail.split(" ").slice(0, CONTEXT_WORDS);
  return `${words.join(" ")}${tail.split(" ").length > CONTEXT_WORDS ? "…" : ""}`;
}
