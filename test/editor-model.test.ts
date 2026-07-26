import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { segmentRange } from "../src/app/lib/editor-model";

describe("segmentRange — M1: an inline finding nested inside a 'passage' channel finding", () => {
  const text =
    "O beneficiario, porque compareceu, uma vez que o prazo corria e desde que apresentou " +
    "os documentos, sera doravante notificado.";

  it("a jargon term inside a dense subordination stays markable as jargon, it does not become 'subordinacao_densa'", () => {
    const { findings } = analyze(text);

    const subordination = findings.find((f) => f.criterion === "subordinacao_densa");
    const jargon = findings.find((f) => f.criterion === "jargon" && f.span.text.toLowerCase() === "doravante");
    expect(subordination).toBeDefined();
    expect(jargon).toBeDefined();
    expect(jargon!.span.start).toBeGreaterThanOrEqual(subordination!.span.start);
    expect(jargon!.span.end).toBeLessThanOrEqual(subordination!.span.end);

    const segments = segmentRange(text, findings, 0, text.length);
    const segment = segments.find((s) => s.start <= jargon!.span.start && s.end >= jargon!.span.end);

    expect(segment?.inline?.criterion).toBe("jargon");
    expect(segment?.passage?.criterion).toBe("subordinacao_densa");
  });
});
