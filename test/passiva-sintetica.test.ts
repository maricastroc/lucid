import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

const spans = (text: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === "passiva_sintetica")
    .map((f) => f.span.text);

describe("passiva_sintetica — detecting the enclitic 'se'", () => {
  it("plain synthetic passive (singular and plural agreement)", () => {
    expect(spans("Aplica-se a multa ao infrator.")).toEqual(["Aplica-se"]);
    expect(spans("Publicam-se os resultados no diário oficial.")).toEqual(["Publicam-se"]);
    expect(spans("Considera-se aprovado o pedido.")).toEqual(["Considera-se"]);
  });

  it("always requiresHuman (the ambiguity of 'se' is irreducible), warning, no suggestion, ISO 5.3.3", () => {
    const f = analyze("Aplicou-se a penalidade.").findings.find((x) => x.criterion === "passiva_sintetica")!;
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.source).toBe("iso-24495-1");
    expect(f.principleGroup).toBe("understandable");
    expect(f.normativeReference?.section).toBe("5.3.3");
  });
});

describe("passiva_sintetica — exclusions (low false positive rate)", () => {
  it("inherently pronominal verbs do NOT mark (the 'se' is an integral particle)", () => {
    expect(spans("Trata-se de um recurso administrativo.")).toEqual([]);
    expect(spans("O artigo refere-se ao prazo legal.")).toEqual([]);
    expect(spans("Torna-se necessário revisar o texto.")).toEqual([]);
  });

  it("mesoclisis ('realizar-se-á') belongs to the mesoclise criterion, not here", () => {
    expect(spans("A análise realizar-se-á em breve.")).toEqual([]);
  });

  it("conditional 'se' (a separate word, not enclitic) does not mark", () => {
    expect(spans("Se o prazo vencer, o pedido será arquivado.")).toEqual([]);
  });

  it("an explicit human subject with an ordinary verb does not mark (there is no enclitic '-se')", () => {
    expect(spans("A comissão aplicou a penalidade ao servidor.")).toEqual([]);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, passivaSintetica: { enabled: false } };
    expect(analyze("Aplica-se a multa.", config).findings.filter((f) => f.criterion === "passiva_sintetica")).toEqual([]);
  });
});

describe("passiva_sintetica — proclisis after a word that forces it (ADR-072)", () => {
  it.each([
    ["Não se aplica a multa ao infrator.", "se aplica"],
    ["A regra que se aplica ao caso é outra.", "se aplica"],
    ["Conforme se depreende dos autos, o pedido é válido.", "se depreende"],
    ["Nunca se soube quem decidiu o processo.", "se soube"],
    ["Sempre se exige a comprovação de renda.", "se exige"],
    ["Tudo se resolve no prazo legal.", "se resolve"],
    ["Quando se aplica a penalidade, o prazo corre.", "se aplica"],
  ])("marks the clitic in '%s'", (text, expected) => {
    expect(spans(text)).toEqual([expected]);
  });

  it("the span covers clitic + verb, and meta records the position and the attractor", () => {
    const f = analyze("Não se aplica a multa.").findings.find((x) => x.criterion === "passiva_sintetica")!;
    expect(f.span.text).toBe("se aplica");
    expect(f.severity).toBe("warning");
    expect(f.requiresHuman).toBe(true);
    expect(f.suggestion).toBeUndefined();
    expect(f.meta).toMatchObject({ position: "proclitic", attractor: "não", form: "se aplica" });
  });

  it("the enclitic arm keeps its own position marker (both arms are one criterion)", () => {
    const f = analyze("Aplica-se a multa.").findings.find((x) => x.criterion === "passiva_sintetica")!;
    expect(f.meta).toMatchObject({ position: "enclitic", form: "aplica-se" });
  });

  it("proclisis and enclisis in the same sentence are counted once each", () => {
    expect(spans("Não se aplica a multa, mas publicam-se os resultados.")).toEqual(["se aplica", "publicam-se"]);
  });
});

describe("passiva_sintetica — proclisis precision: the conditional 'se' stays out", () => {
  it.each([
    "Só se aplica a multa quando há reincidência.",
    "Somente se aplica a multa em caso de dolo.",
    "Mesmo se o prazo vencer, cabe recurso.",
    "Salvo se houver acordo, o processo segue.",
    "Exceto se o pedido for retirado, o rito continua.",
    "Nem se ele quiser, o prazo muda.",
    "Até se o prazo vencer, cabe recurso.",
    "Ainda se discute o mérito, e se o prazo correr, o pedido cai.",
  ])("a word that can introduce a conditional is not an attractor: '%s'", (text) => {
    expect(spans(text)).toEqual([]);
  });

  it("sentence-initial 'Se aplica' stays out — it is the position where the conditional lives", () => {
    expect(spans("Se aplica a multa ao infrator.")).toEqual([]);
  });

  it("a conditional after an ordinary verb does not mark ('não sei se o prazo venceu')", () => {
    expect(spans("Não sei se o prazo venceu.")).toEqual([]);
  });

  it("inherently pronominal verbs are suppressed in proclisis too, through the same lexicon", () => {
    expect(spans("Não se trata de recurso administrativo.")).toEqual([]);
    expect(spans("O artigo que se refere ao prazo foi revogado.")).toEqual([]);
    expect(spans("Quando se torna necessário, o prazo é prorrogado.")).toEqual([]);
  });

  it("a function word after the clitic means it is not attached to a verb", () => {
    expect(spans("Não se, o prazo não corre.")).toEqual([]);
  });

  it("punctuation between the attractor and the clitic breaks the sequence", () => {
    expect(spans("Não, se o prazo vencer, o pedido cai.")).toEqual([]);
  });

  it("the kill switch turns off the proclitic arm as well", () => {
    const config = { ...DEFAULT_CONFIG, passivaSintetica: { enabled: false } };
    expect(analyze("Não se aplica a multa.", config).findings.filter((f) => f.criterion === "passiva_sintetica")).toEqual([]);
  });
});

describe("passiva_sintetica — mesoclisis coexists without double counting under the same criterion", () => {
  it("'realizar-se-á' triggers mesoclise, and passiva_sintetica leaves it alone", () => {
    const d = analyze("O ato realizar-se-á amanhã.");
    expect(d.findings.some((f) => f.criterion === "mesoclise")).toBe(true);
    expect(d.findings.some((f) => f.criterion === "passiva_sintetica")).toBe(false);
  });
});
