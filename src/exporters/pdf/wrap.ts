import type { FontFamily, FontWeight } from "../page-theme";

export type Measure = (text: string, family: FontFamily, weight: FontWeight, size: number) => number;

export function wrapText(
  text: string,
  width: number,
  measure: Measure,
  family: FontFamily,
  weight: FontWeight,
  size: number,
): string[] {
  const words = text.split(/\s+/u).filter((word) => word !== "");
  if (words.length === 0) return [];

  const lines: string[] = [];
  let open = "";

  for (const word of words) {
    const candidate = open === "" ? word : `${open} ${word}`;
    if (open !== "" && measure(candidate, family, weight, size) > width) {
      lines.push(open);
      open = word;
      continue;
    }
    open = candidate;
  }

  if (open !== "") lines.push(open);

  return lines.flatMap((line) =>
    measure(line, family, weight, size) > width ? breakWord(line, width, measure, family, weight, size) : [line],
  );
}

function breakWord(
  word: string,
  width: number,
  measure: Measure,
  family: FontFamily,
  weight: FontWeight,
  size: number,
): string[] {
  const pieces: string[] = [];
  let open = "";

  for (const char of word) {
    const candidate = open + char;
    if (open !== "" && measure(candidate, family, weight, size) > width) {
      pieces.push(open);
      open = char;
      continue;
    }
    open = candidate;
  }

  if (open !== "") pieces.push(open);

  return pieces;
}
