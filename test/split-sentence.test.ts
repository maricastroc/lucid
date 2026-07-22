import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { applySplitAt, clauseSplitPoints, type SplitPoint } from "../src/locales/pt-BR/actions/split-sentence";
import { buildDocument } from "./support/pt";
import type { Span } from "../src/lucid/core/types";

function wholeSpan(source: string): Span {
  return { start: 0, end: source.length, text: source };
}

describe("clauseSplitPoints — detecção de fronteiras", () => {
  it("ponto-e-vírgula vira uma fronteira 'semicolon'", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("semicolon");
    expect(points[0].marker).toBe(";");
    expect(points[0].offset).toBe(source.indexOf(";"));
  });

  it("travessão vira uma fronteira 'dash'", () => {
    const source = "O prazo terminou ontem — ninguém foi avisado a tempo disso.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("dash");
    expect(points[0].marker).toBe("—");
  });

  it("vírgula + conjunção coordenativa vira 'comma_conjunction', ancorada na vírgula", () => {
    const source = "É preciso fazer a verificação dos requisitos, e depois o pedido será apreciado.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe("comma_conjunction");
    expect(points[0].marker).toBe("e");
    expect(points[0].offset).toBe(source.indexOf(", e") );
  });

  it("vírgula SEM conjunção coordenativa não vira ponto de divisão", () => {
    const source = "As contas, aprovadas ontem, seguem para o setor de pagamento agora.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("conjunção coordenativa SEM vírgula antes não vira ponto (evita corte solto)", () => {
    const source = "O comitê analisou o pedido e aprovou o benefício sem qualquer ressalva.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("múltiplas fronteiras saem ordenadas por offset", () => {
    const source = "Revisamos o texto; ajustamos os prazos, e enviamos ao setor responsável hoje.";
    const points = clauseSplitPoints(source, wholeSpan(source));

    expect(points.map((p) => p.kind)).toEqual(["semicolon", "comma_conjunction"]);
    expect(points[0].offset).toBeLessThan(points[1].offset);
  });

  it("prévias before/after descrevem as duas cláusulas (flatten)", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));

    expect(p.before.endsWith("cuidado")).toBe(true);
    expect(p.after.startsWith("depois")).toBe(true);
  });
});

describe("clauseSplitPoints — guardas de borda", () => {
  it("não há ponto quando não existe palavra antes da fronteira", () => {
    const source = "; segue o texto depois do sinal inicial sem nada antes dele aqui.";
    expect(clauseSplitPoints(source, wholeSpan(source))).toEqual([]);
  });

  it("não há ponto quando não existe letra depois da fronteira", () => {
    const source = "O texto termina de forma abrupta aqui mesmo, e";
    const points = clauseSplitPoints(source, wholeSpan(source));
    expect(points).toEqual([]);
  });

  it("respeita os limites do span (só fronteiras internas à frase pedida)", () => {
    const source = "Primeira frase; ainda dentro. Segunda frase; fora do span pedido.";
    const doc = buildDocument(source);
    const first = doc.sentences[0];
    const points = clauseSplitPoints(source, { start: first.start, end: first.end, text: first.text });

    expect(points).toHaveLength(1);
    expect(points[0].offset).toBe(source.indexOf(";"));
  });
});

describe("applySplitAt — transform puro", () => {
  it("ponto-e-vírgula: insere '. ' e capitaliza, descartando o ';'", () => {
    const source = "Precisamos revisar o texto com cuidado; depois enviaremos ao setor.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    expect(applySplitAt(source, p)).toBe(
      "Precisamos revisar o texto com cuidado. Depois enviaremos ao setor.",
    );
  });

  it("vírgula + conjunção: preserva a conjunção como início da nova frase", () => {
    const source = "É preciso fazer a verificação dos requisitos, e depois o pedido será apreciado.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    expect(applySplitAt(source, p)).toBe(
      "É preciso fazer a verificação dos requisitos. E depois o pedido será apreciado.",
    );
  });

  it("travessão: vira ponto final + maiúscula", () => {
    const source = "O prazo terminou ontem — ninguém foi avisado a tempo disso.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    expect(applySplitAt(source, p)).toBe("O prazo terminou ontem. Ninguém foi avisado a tempo disso.");
  });

  it("capitaliza corretamente letra acentuada", () => {
    const source = "Chegamos cedo ao setor; ótimo para adiantar o serviço combinado antes.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    expect(applySplitAt(source, p)).toBe("Chegamos cedo ao setor. Ótimo para adiantar o serviço combinado antes.");
  });

  it("não apaga nenhuma palavra — só remove a pontuação de fronteira e ajusta a caixa", () => {
    const source = "Revisamos o texto com atenção; enviamos ao setor responsável no mesmo dia.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    const out = applySplitAt(source, p);
    const words = (s: string) => (s.toLowerCase().match(/\p{L}+/gu) ?? []).sort();
    expect(words(out)).toEqual(words(source));
  });
});

describe("split — re-análise honesta (a frase alvo deixa de estourar o limiar)", () => {
  it("dividir uma frase longa reduz a contagem do critério long_sentence", () => {
    const source =
      "É preciso fazer a verificação de todos os requisitos formais exigidos pela norma antes do prazo, " +
      "e depois o requerimento apresentado pelo interessado será finalmente apreciado pela autoridade responsável.";

    const before = analyze(source).score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    expect(before.count.warning + before.count.error).toBeGreaterThan(0);

    const [p] = clauseSplitPoints(source, wholeSpan(source));
    const after = analyze(applySplitAt(source, p)).score.byCriterion.find((c) => c.criterion === "long_sentence")!;

    const total = (c: typeof before) => c.count.info + c.count.warning + c.count.error;
    expect(total(after)).toBeLessThan(total(before));
  });

  it("o resultado tem uma frase a mais que o original", () => {
    const source = "Revisamos o texto com muito cuidado; enviamos ao setor responsável no mesmo dia útil.";
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    const out = applySplitAt(source, p);
    expect(buildDocument(out).sentences.length).toBe(buildDocument(source).sentences.length + 1);
  });
});

describe("split — determinismo byte-idêntico", () => {
  const source = "Precisamos revisar o texto com cuidado; depois enviaremos, e concluímos o processo.";

  it("clauseSplitPoints produz sempre o mesmo JSON", () => {
    const r1 = JSON.stringify(clauseSplitPoints(source, wholeSpan(source)));
    const r2 = JSON.stringify(clauseSplitPoints(source, wholeSpan(source)));
    expect(r2).toBe(r1);
  });

  it("applySplitAt é puro e repetível", () => {
    const [p] = clauseSplitPoints(source, wholeSpan(source));
    const a: SplitPoint = p;
    expect(applySplitAt(source, a)).toBe(applySplitAt(source, a));
  });
});
