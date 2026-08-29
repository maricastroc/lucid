import type { PdfPageGeometry, PdfRule } from "./geometry";

const TOLERANCE = 2.5;
const MIN_RULES = 4;
const MIN_HORIZONTAL = 2;
const MIN_VERTICAL = 2;

function touch(a: PdfRule, b: PdfRule): boolean {
  return (
    a.left - TOLERANCE <= b.right &&
    b.left - TOLERANCE <= a.right &&
    a.top - TOLERANCE <= b.bottom &&
    b.top - TOLERANCE <= a.bottom
  );
}

function components(rules: readonly PdfRule[]): PdfRule[][] {
  const seen = new Set<number>();
  const found: PdfRule[][] = [];

  for (let start = 0; start < rules.length; start += 1) {
    if (seen.has(start)) continue;

    const group: PdfRule[] = [];
    const queue = [start];
    seen.add(start);

    while (queue.length > 0) {
      const at = queue.pop() as number;
      group.push(rules[at]);
      for (let other = 0; other < rules.length; other += 1) {
        if (seen.has(other) || !touch(rules[at], rules[other])) continue;
        seen.add(other);
        queue.push(other);
      }
    }

    found.push(group);
  }

  return found;
}

export function countRuledRegions(pages: readonly PdfPageGeometry[]): number {
  let total = 0;

  for (const page of pages) {
    for (const group of components(page.rules)) {
      if (group.length < MIN_RULES) continue;
      const horizontal = group.filter((rule) => rule.direction === "horizontal").length;
      const vertical = group.length - horizontal;
      if (horizontal >= MIN_HORIZONTAL && vertical >= MIN_VERTICAL) total += 1;
    }
  }

  return total;
}
