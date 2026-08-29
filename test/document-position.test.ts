import { describe, expect, it } from "vitest";
import {
  blockTopForOffset,
  offsetAtBlockTop,
  offsetAtScroll,
  rebaseOffset,
  scrollForOffset,
  type BlockBox,
  type DraftLine,
} from "@/app/lib/document-position";

const LINE_HEIGHT = 24;
const PER_LINE = 40;

function draft(length: number): DraftLine[] {
  const lines: DraftLine[] = [];
  for (let at = 0; at < length; at += PER_LINE) lines.push({ offset: at, top: (at / PER_LINE) * LINE_HEIGHT });
  return lines;
}

function blocks(length: number): BlockBox[] {
  const boxes: BlockBox[] = [];
  const per = PER_LINE * 5;
  for (let at = 0; at < length; at += per) {
    const index = at / per;
    boxes.push({ offset: at, top: index * 140, bottom: index * 140 + 120 });
  }
  return boxes;
}

describe("offsetAtScroll", () => {
  it("returns the start of the document when nothing has been scrolled", () => {
    expect(offsetAtScroll(draft(4000), 0)).toBe(0);
  });

  it("returns the line that has just passed the top edge, not the one below it", () => {
    const lines = draft(4000);
    expect(offsetAtScroll(lines, 10 * LINE_HEIGHT)).toBe(400);
    expect(offsetAtScroll(lines, 10 * LINE_HEIGHT + 5)).toBe(400);
    expect(offsetAtScroll(lines, 11 * LINE_HEIGHT)).toBe(440);
  });

  it("holds the last line when scrolled past the end", () => {
    expect(offsetAtScroll(draft(4000), 99_999)).toBe(3960);
  });

  it("answers zero for a draft with no measured lines", () => {
    expect(offsetAtScroll([], 300)).toBe(0);
  });
});

describe("scrollForOffset", () => {
  it("puts the line holding the offset at the top of the box", () => {
    const lines = draft(4000);
    expect(scrollForOffset(lines, 400)).toBe(10 * LINE_HEIGHT);
    expect(scrollForOffset(lines, 421)).toBe(10 * LINE_HEIGHT);
    expect(scrollForOffset(lines, 440)).toBe(11 * LINE_HEIGHT);
  });

  it("does not scroll for an offset at the start of the document", () => {
    expect(scrollForOffset(draft(4000), 0)).toBe(0);
  });
});

describe("draft round trip", () => {
  const lines = draft(8000);

  it.each([
    ["start", 0],
    ["middle", 3712],
    ["end", 7999],
  ])("returns to the same line from the %s of the document", (_where, offset) => {
    const back = offsetAtScroll(lines, scrollForOffset(lines, offset));
    expect(back).toBe(offset - (offset % PER_LINE));
    expect(offsetAtScroll(lines, scrollForOffset(lines, back))).toBe(back);
  });

  it("keeps every scroll position that sits on a line", () => {
    for (const line of lines) expect(scrollForOffset(lines, offsetAtScroll(lines, line.top))).toBe(line.top);
  });
});

describe("offsetAtBlockTop", () => {
  it("names the first block still on screen", () => {
    const boxes = blocks(4000);
    expect(offsetAtBlockTop(boxes, 0)).toBe(0);
    expect(offsetAtBlockTop(boxes, 130)).toBe(200);
    expect(offsetAtBlockTop(boxes, 150)).toBe(200);
  });

  it("holds the last block when scrolled past the end", () => {
    expect(offsetAtBlockTop(blocks(4000), 99_999)).toBe(3800);
  });

  it("answers zero when the document has no blocks", () => {
    expect(offsetAtBlockTop([], 40)).toBe(0);
  });
});

describe("blockTopForOffset", () => {
  it("scrolls to the very top for the opening block, keeping the page margin in view", () => {
    expect(blockTopForOffset(blocks(4000), 0)).toBe(0);
    expect(blockTopForOffset(blocks(4000), 199)).toBe(0);
  });

  it("puts the block holding the offset at the top", () => {
    expect(blockTopForOffset(blocks(4000), 200)).toBe(140);
    expect(blockTopForOffset(blocks(4000), 399)).toBe(140);
    expect(blockTopForOffset(blocks(4000), 400)).toBe(280);
  });

  it("has nowhere to go when the document has no blocks", () => {
    expect(blockTopForOffset([], 400)).toBeNull();
  });
});

describe("crossing between the two modes", () => {
  const length = 8000;
  const lines = draft(length);
  const boxes = blocks(length);

  it.each([
    ["start", 0],
    ["middle", 3000],
    ["end", 7000],
  ])("lands on the same block after going to the draft and back from the %s", (_where, scrollTop) => {
    const fromAudit = offsetAtBlockTop(boxes, scrollTop);
    const draftScroll = scrollForOffset(lines, fromAudit);
    const fromDraft = offsetAtScroll(lines, draftScroll);

    expect(offsetAtBlockTop(boxes, blockTopForOffset(boxes, fromDraft)!)).toBe(fromAudit);
  });
});

describe("rebaseOffset", () => {
  const target = { start: 100, end: 140 };

  it("leaves a place that sits before the edit where it was", () => {
    expect(rebaseOffset(40, target, 60)).toBe(40);
    expect(rebaseOffset(100, target, 60)).toBe(100);
  });

  it("slides a place that sits after the edit by the change in length", () => {
    expect(rebaseOffset(600, target, 60)).toBe(660);
    expect(rebaseOffset(600, target, -25)).toBe(575);
  });

  it("collapses a place that sat inside the edit to its start", () => {
    expect(rebaseOffset(120, target, 60)).toBe(100);
    expect(rebaseOffset(139, target, -25)).toBe(100);
  });

  it("never lands before the start of the document", () => {
    expect(rebaseOffset(150, { start: 0, end: 140 }, -140)).toBe(10);
    expect(rebaseOffset(150, { start: 0, end: 140 }, -900)).toBe(0);
  });

  it("keeps the reader on the same paragraph when a shorter rewrite lands above them", () => {
    const lines = draft(8000);
    const before = offsetAtScroll(lines, 40 * LINE_HEIGHT);
    const shortened = rebaseOffset(before, { start: 200, end: 700 }, -300);

    expect(shortened).toBe(before - 300);
    const restored = offsetAtScroll(lines, scrollForOffset(lines, shortened));
    expect(restored).toBeLessThanOrEqual(shortened);
    expect(shortened - restored).toBeLessThan(PER_LINE);
  });
});
