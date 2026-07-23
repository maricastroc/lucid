import { sentenceSpanAt, type Span } from "@/lucid";

const RE_BLANK_LINE = /\n[ \t]*\n/g;

export type RewriteUnit = "paragraph" | "sentence";

export function rewriteTargetAt(text: string, offset: number): { span: Span; unit: RewriteUnit } {
  const hasParagraphBreaks = /\n[ \t]*\n/.test(text);
  if (!hasParagraphBreaks) return { span: sentenceSpanAt(text, offset), unit: "sentence" };
  return { span: paragraphSpanAt(text, offset), unit: "paragraph" };
}

export function paragraphSpanAt(text: string, offset: number): Span {
  let start = 0;
  let end = text.length;

  RE_BLANK_LINE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RE_BLANK_LINE.exec(text)) !== null) {
    const gapStart = match.index;
    const gapEnd = match.index + match[0].length;
    if (gapStart >= offset) {
      end = gapStart;
      break;
    }
    start = gapEnd;
  }

  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;

  return { start, end, text: text.slice(start, end) };
}
