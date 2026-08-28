import { describe, expect, it } from "vitest";
import { excerptState, PROBE_MAX_EXCERPT } from "../src/app/lib/probe-excerpt";

describe("probe excerpt — what the panel refuses before sending", () => {
  it("treats an empty or blank selection as nothing to send", () => {
    for (const raw of ["", "   ", "\n\t "]) {
      const state = excerptState(raw);
      expect(state.empty).toBe(true);
      expect(state.sendable).toBe(false);
    }
  });

  it("trims the selection without collapsing the passage's own line breaks", () => {
    const state = excerptState("  O prazo termina dia 30.\n\nSe você perder, o pedido não vale.  ");
    expect(state.text).toBe("O prazo termina dia 30.\n\nSe você perder, o pedido não vale.");
    expect(state.sendable).toBe(true);
  });

  it("counts the characters that will actually travel, after trimming", () => {
    expect(excerptState("  abc  ").chars).toBe(3);
  });

  it("accepts an excerpt exactly at the ceiling and refuses one character past it", () => {
    expect(excerptState("a".repeat(PROBE_MAX_EXCERPT)).sendable).toBe(true);
    const over = excerptState("a".repeat(PROBE_MAX_EXCERPT + 1));
    expect(over.tooLong).toBe(true);
    expect(over.sendable).toBe(false);
  });

  it("refuses on the client exactly what the route refuses on arrival", () => {
    expect(PROBE_MAX_EXCERPT).toBe(8000);
  });
});
