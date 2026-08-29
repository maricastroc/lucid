export const BLOCK_OFFSET_ATTRIBUTE = "data-start";

const LINE_SCAN_STEP = 256;

export interface DraftLine {
  readonly offset: number;
  readonly top: number;
}

export interface BlockBox {
  readonly offset: number;
  readonly top: number;
  readonly bottom: number;
}
export function offsetAtScroll(lines: readonly DraftLine[], scrollTop: number): number {
  if (lines.length === 0) return 0;
  let low = 0;
  let high = lines.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].top <= scrollTop) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return lines[found].offset;
}

export function scrollForOffset(lines: readonly DraftLine[], offset: number): number {
  if (lines.length === 0) return 0;
  let low = 0;
  let high = lines.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].offset <= offset) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return lines[found].top;
}

export function offsetAtBlockTop(boxes: readonly BlockBox[], top: number): number {
  for (const box of boxes) if (box.bottom > top) return box.offset;
  return boxes.length === 0 ? 0 : boxes[boxes.length - 1].offset;
}

export function blockTopForOffset(boxes: readonly BlockBox[], offset: number): number | null {
  if (boxes.length === 0) return null;
  let found = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    if (boxes[i].offset > offset) break;
    found = i;
  }
  return found === 0 ? 0 : boxes[found].top;
}

export function rebaseOffset(offset: number, target: { start: number; end: number }, delta: number): number {
  if (offset <= target.start) return offset;
  if (offset >= target.end) return Math.max(0, offset + delta);
  return target.start;
}

export function measureDraftLines(textarea: HTMLTextAreaElement): DraftLine[] {
  const value = textarea.value;
  if (value === "") return [{ offset: 0, top: 0 }];
  if (typeof document.createRange().getBoundingClientRect !== "function") return [{ offset: 0, top: 0 }];

  const mirror = buildMirror(textarea);
  const node = document.createTextNode(value);
  mirror.appendChild(node);
  document.body.appendChild(mirror);

  const lines: DraftLine[] = [];

  try {
    const range = document.createRange();
    const base = mirror.getBoundingClientRect().top;
    const topAt = (at: number): number => {
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      return Math.round(range.getBoundingClientRect().top - base);
    };

    let paragraphStart = 0;
    for (const paragraph of value.split("\n")) {
      const end = paragraphStart + paragraph.length;

      if (paragraph.length > 0) collectWrapPoints(paragraphStart, end, topAt, lines);
      paragraphStart = end + 1;
    }
  } finally {
    mirror.remove();
  }

  return lines.length > 0 ? lines : [{ offset: 0, top: 0 }];
}

function collectWrapPoints(start: number, end: number, topAt: (at: number) => number, into: DraftLine[]): void {
  let at = start;
  let top = topAt(at);
  into.push({ offset: at, top });

  while (at < end - 1) {
    let low = at + 1;
    let high = Math.min(end, at + LINE_SCAN_STEP);

    while (high < end && topAt(high - 1) === top) {
      low = high;
      high = Math.min(end, high + LINE_SCAN_STEP);
    }
    if (topAt(high - 1) === top) return;

    while (low < high) {
      const middle = (low + high) >> 1;
      if (topAt(middle) === top) low = middle + 1;
      else high = middle;
    }

    at = low;
    top = topAt(at);
    into.push({ offset: at, top });
  }
}

function buildMirror(textarea: HTMLTextAreaElement): HTMLDivElement {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");

  mirror.setAttribute("aria-hidden", "true");
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${textarea.clientWidth}px`;
  for (const property of MIRRORED_STYLES) mirror.style[property] = style[property];

  return mirror;
}

const MIRRORED_STYLES = [
  "boxSizing",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "tabSize",
  "textIndent",
  "textTransform",
  "wordSpacing",
] as const;

export function readBlockBoxes(container: HTMLElement): BlockBox[] {
  const top = container.getBoundingClientRect().top - container.scrollTop;
  return [...container.querySelectorAll<HTMLElement>(`[${BLOCK_OFFSET_ATTRIBUTE}]`)].map((block) => {
    const rect = block.getBoundingClientRect();
    return {
      offset: Number(block.getAttribute(BLOCK_OFFSET_ATTRIBUTE)),
      top: rect.top - top,
      bottom: rect.bottom - top,
    };
  });
}
