/**
 * Regressões que documentam trade-offs JÁ CONHECIDOS e INTENCIONAIS da política de
 * segmentação (docs/ARQUITETURA.md §6.0/§6.1) — não os corrigem, apenas os deixam
 * explícitos através do pipeline completo (`buildDocument`, normalização + segmentação
 * + tokenização juntas). Ver também `test/segment-sentences.test.ts`, que já cobre os
 * mesmos casos no nível de segmentação isolada.
 *
 * Política: abreviação e sigla-com-ponto-isolado SEMPRE suprimem a quebra de frase,
 * mesmo quando o contexto indicaria fim de frase real — "juntar em vez de quebrar
 * falso". Este arquivo garante que, mesmo quando duas frases acabam grudadas por esse
 * motivo, a TOKENIZAÇÃO dentro do resultado continua correta e determinística — o
 * trade-off afeta a fronteira de frase, não a qualidade dos tokens dentro dela.
 */
import { describe, expect, it } from "vitest";
import { buildDocument } from "../src/lucid/core/document/model";

describe("regressão conhecida — abreviação 'etc.' pode unir frases", () => {
  it("'etc. Voltamos' fica em UMA frase (trade-off documentado, não corrigido aqui)", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);
    expect(doc.sentences[0].text).toBe(source);
  });

  it("mesmo unida, a frase tokeniza 'etc' e 'Voltamos' como palavras distintas", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    const doc = buildDocument(source);

    const textos = doc.sentences[0].tokens.map((t) => t.text);
    expect(textos).toContain("etc");
    expect(textos).toContain("Voltamos");
    // "etc" e "." continuam tokens separados — a abreviação não vira um token único:
    const indiceEtc = textos.indexOf("etc");
    expect(textos[indiceEtc + 1]).toBe(".");
  });
});

describe("regressão conhecida — sigla terminada em ponto pode unir frases", () => {
  it("'E.U.A. Eles moram' fica em UMA frase (trade-off documentado, não corrigido aqui)", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    expect(doc.sentences).toHaveLength(1);
    expect(doc.sentences[0].text).toBe(source);
  });

  it("mesmo unida, a sigla tokeniza como um único token de palavra ('E.U.A')", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    const sigla = doc.sentences[0].tokens.find((t) => t.text.startsWith("E."));
    expect(sigla?.text).toBe("E.U.A");
    expect(sigla?.isWord).toBe(true);

    const textos = doc.sentences[0].tokens.map((t) => t.text);
    expect(textos).toContain("Eles");
    expect(textos).toContain("moram");
  });

  it("wordCount da frase unida soma as palavras das duas 'sentenças gramaticais'", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    const doc = buildDocument(source);

    // Nós, moramos, nos, E.U.A, Eles, moram, na, França = 8 palavras
    expect(doc.sentences[0].wordCount).toBe(8);
  });
});
