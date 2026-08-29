import { useEffect, useRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { useReadingPosition, type ReadingPosition } from "@/app/hooks/use-reading-position";
import type { Mode } from "@/app/components/document-view";

const BLOCK_SIZE = 100;
const BLOCK_PITCH = 140;
const BLOCK_HEIGHT = 120;
const PER_LINE = 40;
const LINE_HEIGHT = 24;

const TEXT = Array.from({ length: 10 }, (_, i) => `bloco ${i} `.padEnd(BLOCK_SIZE, "x")).join("");

const elementRect = Element.prototype.getBoundingClientRect;
const rangeRect = Range.prototype.getBoundingClientRect;
const raf = window.requestAnimationFrame;

function rect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const start = this.getAttribute("data-start");
    if (start === null) return rect(0, 0);
    const scroller = this.closest("[data-testid=scroller]");
    const scrolled = scroller instanceof HTMLElement ? scroller.scrollTop : 0;
    return rect((Number(start) / BLOCK_SIZE) * BLOCK_PITCH - scrolled, BLOCK_HEIGHT);
  };
  Range.prototype.getBoundingClientRect = function (this: Range) {
    return rect(Math.floor(this.startOffset / PER_LINE) * LINE_HEIGHT, LINE_HEIGHT);
  };

  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  }) as typeof window.requestAnimationFrame;
});

afterAll(() => {
  Element.prototype.getBoundingClientRect = elementRect;
  Range.prototype.getBoundingClientRect = rangeRect;
  window.requestAnimationFrame = raf;
});

function Harness({ mode, text, onReady }: { mode: Mode; text: string; onReady?: (r: ReadingPosition) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reading = useReadingPosition(scrollRef, mode, text);
  useEffect(() => {
    onReady?.(reading);
  }, [onReady, reading]);
  const blocks = text.match(new RegExp(`.{1,${BLOCK_SIZE}}`, "g")) ?? [];

  return (
    <div ref={scrollRef} data-testid="scroller">
      {mode === "edit" ? (
        <textarea aria-label="rascunho" defaultValue={text} readOnly />
      ) : (
        <article>
          {blocks.map((block, i) => (
            <p key={i} data-start={i * BLOCK_SIZE}>
              {block}
            </p>
          ))}
        </article>
      )}
    </div>
  );
}

function scroller(): HTMLElement {
  return screen.getByTestId("scroller");
}

function draft(): HTMLTextAreaElement {
  return screen.getByLabelText("rascunho") as HTMLTextAreaElement;
}

function scrollTo(element: HTMLElement, top: number) {
  act(() => {
    element.scrollTop = top;
    element.dispatchEvent(new Event("scroll"));
  });
}

describe("useReadingPosition", () => {
  it("opens the draft where the reader stopped in the audited document", () => {
    const view = render(<Harness mode="audit" text={TEXT} />);
    scrollTo(scroller(), BLOCK_PITCH * 3);
    view.rerender(<Harness mode="edit" text={TEXT} />);

    expect(draft().scrollTop).toBe(Math.floor((BLOCK_SIZE * 3) / PER_LINE) * LINE_HEIGHT);
  });

  it("places a collapsed cursor at the offset instead of selecting anything", () => {
    const view = render(<Harness mode="audit" text={TEXT} />);
    scrollTo(scroller(), BLOCK_PITCH * 4);
    view.rerender(<Harness mode="edit" text={TEXT} />);

    expect(draft().selectionStart).toBe(BLOCK_SIZE * 4);
    expect(draft().selectionEnd).toBe(draft().selectionStart);
  });

  it("returns to the block the reader had open in the draft", () => {
    const view = render(<Harness mode="edit" text={TEXT} />);
    scrollTo(draft(), LINE_HEIGHT * 15);
    view.rerender(<Harness mode="audit" text={TEXT} />);

    expect(scroller().scrollTop).toBe(BLOCK_PITCH * 6);
  });

  it.each([
    ["the start", 0, 0],
    ["the middle", BLOCK_PITCH * 5, BLOCK_PITCH * 5],
    ["the end", BLOCK_PITCH * 9, BLOCK_PITCH * 9],
  ])("comes back to %s of the document after a round trip", (_where, top, expected) => {
    const view = render(<Harness mode="audit" text={TEXT} />);
    scrollTo(scroller(), top);
    view.rerender(<Harness mode="edit" text={TEXT} />);
    view.rerender(<Harness mode="audit" text={TEXT} />);

    expect(scroller().scrollTop).toBe(expected);
  });

  it("stays at the top of the document without scrolling the opening margin away", () => {
    const view = render(<Harness mode="audit" text={TEXT} />);
    scrollTo(scroller(), 0);
    view.rerender(<Harness mode="edit" text={TEXT} />);
    view.rerender(<Harness mode="audit" text={TEXT} />);

    expect(scroller().scrollTop).toBe(0);
  });

  it("does not move a document that is opened straight into the draft", () => {
    render(<Harness mode="edit" text={TEXT} />);
    expect(draft().scrollTop).toBe(0);
    expect(draft().selectionStart).toBe(0);
  });

  it("keeps the place when the text is cut below the reader, changing its length", () => {
    const view = render(<Harness mode="audit" text={TEXT} />);
    scrollTo(scroller(), BLOCK_PITCH * 6);

    const shorter = TEXT.slice(0, BLOCK_SIZE * 8);
    view.rerender(<Harness mode="edit" text={shorter} />);
    expect(draft().scrollTop).toBe(Math.floor((BLOCK_SIZE * 6) / PER_LINE) * LINE_HEIGHT);

    view.rerender(<Harness mode="audit" text={shorter} />);
    expect(scroller().scrollTop).toBe(BLOCK_PITCH * 6);
  });

  it("moves the place up when an edit above it shortens the text", () => {
    let reading: ReadingPosition | null = null;
    const view = render(
      <Harness
        mode="audit"
        text={TEXT}
        onReady={(r) => {
          reading = r;
        }}
      />,
    );
    scrollTo(scroller(), BLOCK_PITCH * 6);

    const shorter = TEXT.slice(0, BLOCK_SIZE) + TEXT.slice(BLOCK_SIZE * 3);
    act(() => reading!.rebase({ start: BLOCK_SIZE, end: BLOCK_SIZE * 3, text: "" }, -BLOCK_SIZE * 2));
    view.rerender(<Harness mode="edit" text={shorter} />);
    expect(draft().scrollTop).toBe(Math.floor((BLOCK_SIZE * 4) / PER_LINE) * LINE_HEIGHT);

    view.rerender(<Harness mode="audit" text={shorter} />);
    expect(scroller().scrollTop).toBe(BLOCK_PITCH * 4);
  });
});
