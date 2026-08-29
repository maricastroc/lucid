import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "@/lucid/core/config";
import { createDataView } from "@/locales/pt-BR/datasets/registry";
import type { DatasetId } from "@/locales/pt-BR/datasets/registry";
import { siglaSemExpansaoPass } from "@/locales/pt-BR/passes/sigla-sem-expansao";
import { proseEnumerationPass } from "@/locales/pt-BR/passes/prose-enumeration";
import { perifraseInfladaPass } from "@/locales/pt-BR/passes/perifrase-inflada";
import type { Pass } from "@/lucid/core/types";

import { buildDocument } from "../support/pt";
import { CRITERIA, criterionById, cuedCriteria } from "../../scripts/corpus/lib/criteria";
import { countWords, draw, segment } from "../../scripts/corpus/lib/segment";
import { splitOf } from "../../scripts/corpus/lib/split";

const PASSES: Record<string, Pass> = {
  sigla_sem_expansao: siglaSemExpansaoPass,
  prose_enumeration: proseEnumerationPass,
  perifrase_inflada: perifraseInfladaPass,
};

const SAMPLES = [
  "O processo foi encaminhado à SEFAZ para manifestação no prazo de cinco dias úteis.",
  "A Controladoria-Geral da União (CGU) publicou o relatório anual de atividades.",
  "Compete ao órgão: 1) instruir o processo; 2) emitir parecer; 3) encaminhar à autoridade competente.",
  "O requerimento será analisado no âmbito da comissão permanente designada para esse fim.",
  "Fica instituído o programa, com vigência de doze meses, prorrogável uma única vez.",
  "O pagamento observará o disposto no art. 5º, incisos I e II, do Decreto nº 10.000.",
  "Em face da ausência de manifestação, o pedido será arquivado com relação a todos os interessados.",
  "A comissão avaliará, primeiro, a documentação; segundo, o mérito técnico das propostas apresentadas.",
  "Nenhuma sigla aparece nesta frase simples e direta sobre o funcionamento do serviço público.",
];

function dataDepsOf(pass: Pass): DatasetId[] {
  return [...(pass.dataDeps ?? [])] as DatasetId[];
}

function fires(pass: Pass, text: string): boolean {
  return (
    pass.run({ doc: buildDocument(text), config: DEFAULT_CONFIG, data: createDataView(dataDepsOf(pass)) }).length > 0
  );
}

describe("a cue do estrato E é mais larga que o detector", () => {
  for (const criterion of CRITERIA) {
    it(`${criterion.id}: todo trecho em que o detector dispara passa pela cue`, () => {
      const missed = SAMPLES.filter((text) => fires(PASSES[criterion.id], text) && !criterion.cue(text));
      expect(missed).toEqual([]);
    });
  }

  it("a cue pega texto que o detector deixa passar — é isso que dá falso negativo para medir", () => {
    const widerSomewhere = CRITERIA.some((criterion) =>
      SAMPLES.some((text) => criterion.cue(text) && !fires(PASSES[criterion.id], text)),
    );
    expect(widerSomewhere).toBe(true);
  });

  it("cuedCriteria devolve os mesmos critérios que as cues individuais", () => {
    for (const text of SAMPLES) {
      const expected = CRITERIA.filter((criterion) => criterion.cue(text)).map((criterion) => criterion.id);
      expect(cuedCriteria(text)).toEqual(expected);
    }
  });

  it("a cue de sigla ignora a lista de exclusão do detector", () => {
    const text = "O interessado deverá informar o CPF no formulário eletrônico antes do envio.";
    expect(criterionById("sigla_sem_expansao").cue(text)).toBe(true);
    expect(fires(PASSES.sigla_sem_expansao, text)).toBe(false);
  });
});

describe("segmentação", () => {
  it("preserva os deslocamentos do texto de origem", () => {
    const text = "Linha curta.\nEste parágrafo tem palavras suficientes para virar um trecho do corpus de avaliação.";
    const [passage] = segment(text, { minWords: 12, maxWords: 140 });
    expect(text.slice(passage.start, passage.end)).toBe(passage.text);
  });

  it("descarta bloco fora da faixa em vez de cortá-lo", () => {
    const short = "Poucas palavras aqui.";
    expect(segment(short)).toEqual([]);
  });

  it("conta palavras ignorando numeração e pontuação", () => {
    expect(countWords("Art. 5º — o prazo é de 30 dias.")).toBe(6);
  });
});

describe("split e sorteio", () => {
  it("o split é determinístico e depende da semente", () => {
    expect(splitOf("doc-a", "seed-1", 0.3)).toBe(splitOf("doc-a", "seed-1", 0.3));
    const withSeedA = ["a", "b", "c", "d", "e", "f"].map((id) => splitOf(id, "seed-1", 0.5));
    const withSeedB = ["a", "b", "c", "d", "e", "f"].map((id) => splitOf(id, "seed-2", 0.5));
    expect(withSeedA).not.toEqual(withSeedB);
  });

  it("respeita aproximadamente a fração pedida", () => {
    const ids = Array.from({ length: 2000 }, (_, i) => `doc-${i}`);
    const test = ids.filter((id) => splitOf(id, "seed", 0.3) === "test").length;
    expect(test / ids.length).toBeGreaterThan(0.27);
    expect(test / ids.length).toBeLessThan(0.33);
  });

  it("o sorteio é reproduzível e fica em [0,1)", () => {
    const value = draw("seed", "p#0001");
    expect(value).toBe(draw("seed", "p#0001"));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});
