import type { PdfPageGeometry } from "./geometry";

const BUCKETS = 50;
const FIRST_CENTRAL = 13;
const LAST_CENTRAL = 37;
const MIN_GUTTER = 3;
const MIN_ITEMS = 30;
const GUTTER_PAGE_RATIO = 0.6;

function emptyBuckets(page: PdfPageGeometry): boolean[] {
  const filled = new Array<boolean>(BUCKETS).fill(false);

  for (const item of page.items) {
    if (item.text.trim() === "") continue;
    const from = Math.max(0, Math.min(BUCKETS - 1, Math.floor((item.left / page.width) * BUCKETS)));
    const to = Math.max(0, Math.min(BUCKETS - 1, Math.floor(((item.left + item.width) / page.width) * BUCKETS)));
    for (let at = from; at <= to; at += 1) filled[at] = true;
  }

  return filled.map((occupied) => !occupied);
}

const eligiblePages = (pages: readonly PdfPageGeometry[]): PdfPageGeometry[] =>
  pages.filter((page) => page.items.filter((item) => item.text.trim() !== "").length >= MIN_ITEMS);

export function gutterProfile(pages: readonly PdfPageGeometry[]): number[] {
  const eligible = eligiblePages(pages);
  if (eligible.length === 0) return new Array<number>(BUCKETS).fill(0);

  const counts = new Array<number>(BUCKETS).fill(0);
  for (const page of eligible) {
    for (const [at, empty] of emptyBuckets(page).entries()) {
      if (empty) counts[at] += 1;
    }
  }

  return counts.map((count) => count / eligible.length);
}

export function hasPersistentGutter(pages: readonly PdfPageGeometry[]): boolean {
  if (eligiblePages(pages).length === 0) return false;

  const profile = gutterProfile(pages);
  let run = 0;

  for (let at = FIRST_CENTRAL; at <= LAST_CENTRAL; at += 1) {
    run = profile[at] >= GUTTER_PAGE_RATIO ? run + 1 : 0;
    if (run >= MIN_GUTTER) return true;
  }

  return false;
}
