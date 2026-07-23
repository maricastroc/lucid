import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { segmentRange } from "../src/app/lib/editor-model";

describe("segmentRange — M1: finding inline aninhado num finding de canal 'passage'", () => {
  const text =
    "O beneficiario, porque compareceu, uma vez que o prazo corria e desde que apresentou " +
    "os documentos, sera doravante notificado.";

  it("um jargão dentro de uma subordinação densa continua marcável como jargão, não vira 'subordinacao_densa'", () => {
    const { findings } = analyze(text);

    const subordinacao = findings.find((f) => f.criterion === "subordinacao_densa");
    const jargao = findings.find((f) => f.criterion === "jargon" && f.span.text.toLowerCase() === "doravante");
    expect(subordinacao).toBeDefined();
    expect(jargao).toBeDefined();
    expect(jargao!.span.start).toBeGreaterThanOrEqual(subordinacao!.span.start);
    expect(jargao!.span.end).toBeLessThanOrEqual(subordinacao!.span.end);

    const segments = segmentRange(text, findings, 0, text.length);
    const segment = segments.find((s) => s.start <= jargao!.span.start && s.end >= jargao!.span.end);

    expect(segment?.inline?.criterion).toBe("jargon");
    expect(segment?.passage?.criterion).toBe("subordinacao_densa");
  });
});
