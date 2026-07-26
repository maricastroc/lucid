import { describe, expect, it } from "vitest";
import { clauseSplitPoints } from "../src/locales/pt-BR/actions/split-sentence";
import { buildDocument } from "./support/pt";
import type { Span } from "../src/lucid/core/types";

function wholeSpan(source: string): Span {
  return { start: 0, end: source.length, text: source };
}

describe("clauseSplitPoints — boundary detection", () => {
  it("a semicolon becomes a 'semicolon' boundary", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("semicolon");
    expect(points[0].marker).toBe(";");
    expect(points[0].offset).toBe(source.indexOf(";"));
  });

  it("an em dash becomes a 'dash' boundary", () => {
    const source = "O prazo terminou ontem — ninguém foi avisado a tempo disso.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("dash");
    expect(points[0].marker).toBe("—");
  });

  it("comma + coordinating conjunction becomes 'comma_conjunction', anchored at the comma", () => {
    const source = "É preciso fazer a verificação dos requisitos, e depois o pedido será apreciado.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("comma_conjunction");
    expect(points[0].marker).toBe("e");
    expect(points[0].offset).toBe(source.indexOf(", e") );
  });

  it("a comma WITHOUT a coordinating conjunction is not a split point", () => {
    const source = "As contas, aprovadas ontem, seguem para o setor de pagamento agora.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("a coordinating conjunction with NO preceding comma is not a point (avoids a loose cut)", () => {
    const source = "O comitê analisou o pedido e aprovou o benefício sem qualquer ressalva.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("multiple boundaries come out ordered by offset", () => {
    const source = "Revisamos o texto; ajustamos os prazos, e enviamos ao setor responsável hoje.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points.map((p) => p.kind)).toEqual(["semicolon", "comma_conjunction"]);
    expect(points[0].offset).toBeLessThan(points[1].offset);
  });

  it("the before/after previews describe the two clauses (flattened)", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));

    expect(p.before.endsWith("cuidado")).toBe(true);
    expect(p.after.startsWith("depois")).toBe(true);
  });
});

describe("clauseSplitPoints — edge guards", () => {
  it("there is no point when no word precedes the boundary", () => {
    const source = "; segue o texto depois do sinal inicial sem nada antes dele aqui.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("there is no point when no letter follows the boundary", () => {
    const source = "O texto termina de forma abrupta aqui mesmo, e";
    const points = clauseSplitPoints(source, wholeSpan(source));
    expect(points).toEqual([]);
  });

  it("respects the span limits (only boundaries inside the requested sentence)", () => {
    const source = "Primeira frase; ainda dentro. Segunda frase; fora do span pedido.";
    const doc = buildDocument(source);
    const first = doc.sentences[0];
    const points = clauseSplitPoints(source, { start: first.start, end: first.end, text: first.text });

    expect(points).toHaveLength(1);
    expect(points[0].offset).toBe(source.indexOf(";"));
  });
});

describe("clauseSplitPoints — information only, never an action (ADR-054)", () => {
  it("the module exports no text transform — splitting is the author's job", async () => {
    const mod = await import("../src/locales/pt-BR/actions/split-sentence");
    expect(Object.keys(mod).sort()).toEqual(["clauseSplitPoints"]);
  });

  it("the before/after previews are quotations from the text (nothing fabricated)", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    expect(source.replace(/\s+/g, " ")).toContain(p.before);
    expect(source.replace(/\s+/g, " ")).toContain(p.after);
  });
});

describe("split — byte-identical determinism", () => {
  const source = "Precisamos revisar o texto com cuidado; depois enviaremos, e concluímos o processo.";

  it("clauseSplitPoints always produces the same JSON", () => {
    const r1 = JSON.stringify(clauseSplitPoints(source, wholeSpan(source)));
    const r2 = JSON.stringify(clauseSplitPoints(source, wholeSpan(source)));
    expect(r2).toBe(r1);
  });
});
