import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { interpretFleschPt } from "../src/locales/pt-BR/readability/flesch-pt";
import { countSyllables } from "../src/locales/pt-BR/services/syllables";
import { describeReadability } from "../src/app/lib/readability";
import type { ReadabilityReading } from "../src/lucid";

const read = (text: string): ReadabilityReading => interpretFleschPt(analyze(text).metrics);

/** O período jurídico real do §1: 44 palavras numa frase, Flesch-PT negativo LEGÍTIMO. */
const JURIDIQUES =
  "Fica assegurado ao interessado, na hipótese de indeferimento do requerimento formulado perante a autoridade " +
  "competente, o direito de interposição de recurso administrativo, no prazo improrrogável de dez dias contados da " +
  "data da respectiva ciência, sem prejuízo das demais medidas judiciais eventualmente cabíveis na espécie.";

describe("interpretação da leiturabilidade — nunca altera o valor medido", () => {
  it("NÃO há clamp: valor acima de 100 é preservado, com a posição ao lado", () => {
    const r = read("Eu fui.");
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBe(162.2);
    expect(r.position).toBe("above_range");
    expect(r.band).toBeNull();
  });

  it("negativo de texto REAL é medida válida, não anomalia — a distinção que o clamp apagaria", () => {
    const r = read(JURIDIQUES);
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBeLessThan(0);
    expect(r.position).toBe("below_range");
    expect(r.anomalies).toEqual([]);
  });

  it("valor dentro do intervalo recebe faixa com rótulo e limites", () => {
    const r = read("O gato subiu no telhado. O cão dormiu no sofá. A casa ficou quieta. Todos foram dormir cedo.");
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.position).toBe("in_range");
    expect(r.band).not.toBeNull();
    expect(r.band!.min).toBeLessThanOrEqual(r.value);
    expect(r.band!.label.length).toBeGreaterThan(0);
  });
});

describe("causas de ausência de medida — explícitas, nunca genéricas", () => {
  it("texto sem palavra devolve `no_words` (e o valor é null, não 0)", () => {
    const d = analyze("!!! ??? ...");
    expect(d.metrics.fleschPt).toBeNull();
    expect(interpretFleschPt(d.metrics)).toEqual({ kind: "unmeasurable", cause: "no_words" });
  });

  it("texto vazio devolve `no_words`", () => {
    expect(read("")).toEqual({ kind: "unmeasurable", cause: "no_words" });
  });

  it("a copy da ausência diz que não é zero", () => {
    const display = describeReadability(read(""));
    expect(display.value).toBe("—");
    expect(display.notes.join(" ")).toContain("não é zero");
  });
});

describe("anomalias da medição — cada uma nomeada, com grandeza e limiar", () => {
  it("`syllables_per_word_impossible`: média de sílabas acima do máximo aritmeticamente possível", () => {
    const r = read(`${"aeiou".repeat(100)}.`);
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    expect(r.value).toBeLessThan(-1000);
    const anomaly = r.anomalies.find((a) => a.cause === "syllables_per_word_impossible");
    expect(anomaly).toBeDefined();
    expect(anomaly).toMatchObject({ cause: "syllables_per_word_impossible", threshold: 20 });
  });

  it("o limiar de 20 sílabas/palavra tem base dura: a palavra mais longa do PT conta 18", () => {
    expect(countSyllables("pneumoultramicroscopicossilicovulcanoconiótico")).toBe(18);

    const r = read("pneumoultramicroscopicossilicovulcanoconiótico.");
    if (r.kind !== "measured") throw new Error("esperava medida");
    expect(r.anomalies.some((a) => a.cause === "syllables_per_word_impossible")).toBe(false);
  });

  it("`sentence_boundary_missing`: 300 palavras sem pontuação viram uma frase só", () => {
    const r = read(Array(300).fill("palavra").join(" "));
    expect(r.kind).toBe("measured");
    if (r.kind !== "measured") return;

    const anomaly = r.anomalies.find((a) => a.cause === "sentence_boundary_missing");
    expect(anomaly).toMatchObject({ cause: "sentence_boundary_missing", wordsPerSentence: 300, threshold: 100 });
    expect(describeReadability(r).notes.join(" ")).toContain("fronteira de frase");
  });

  it("`small_sample`: abaixo de 20 palavras a média é dominada por um token", () => {
    const r = read("Eu fui.");
    if (r.kind !== "measured") throw new Error("esperava medida");
    expect(r.anomalies).toContainEqual({ cause: "small_sample", words: 2, threshold: 20 });
  });

  it("a justificativa empírica do limiar de amostra: uma palavra move o índice 29 pontos", () => {
    const duas = read("Eu fui.");
    const tres = read("Ele é bom.");
    if (duas.kind !== "measured" || tres.kind !== "measured") throw new Error("esperava medida");

    expect(duas.value).toBe(162.2);
    expect(tres.value).toBe(133);
    expect(Math.round(duas.value - tres.value)).toBe(29);
  });

  it("texto corrido normal não recebe anomalia nenhuma", () => {
    const r = read(JURIDIQUES);
    if (r.kind !== "measured") throw new Error("esperava medida");
    expect(r.anomalies).toEqual([]);
  });

  it("anomalias saem em ordem FIXA (degeneração da entrada antes de amostra)", () => {
    const r = read(`${"aeiou".repeat(100)}.`);
    if (r.kind !== "measured") throw new Error("esperava medida");
    expect(r.anomalies.map((a) => a.cause)).toEqual(["syllables_per_word_impossible", "small_sample"]);
  });
});

describe("determinismo da interpretação", () => {
  it("mesma entrada, leitura idêntica (a interpretação é pura como a Camada 1)", () => {
    for (const text of ["Eu fui.", JURIDIQUES, "", `${"aeiou".repeat(100)}.`]) {
      expect(read(text)).toEqual(read(text));
      expect(describeReadability(read(text))).toEqual(describeReadability(read(text)));
    }
  });

  it("não existe variante de aprovação na leitura — só medida, posição e causa", () => {
    const r = read(JURIDIQUES);
    expect(Object.keys(r).sort()).toEqual(["anomalies", "band", "kind", "position", "value"]);
    expect(JSON.stringify(r)).not.toContain("approved");
  });
});
