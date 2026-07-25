import { describe, expect, it } from "vitest";
import { CRITERION_IDS } from "../../src/lucid";
import { dataHashFor, REGISTRY } from "../../src/locales/pt-BR/datasets/registry";
import type { DatasetId } from "../../src/locales/pt-BR/datasets/registry";
import { buildEvalArtifact, criteriaCoverage, hashGoldens, scoreCounts, serializeEvalArtifact } from "./compute";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { GOLDEN_INTEGRADO } from "../golden/integrated-golden";

/**
 * Invariantes do artefato — SEM flag, roda no CI.
 *
 * O que este arquivo protege não é o valor dos números (isso é trabalho dos evals), e sim
 * as propriedades que fazem o artefato publicável: estampa presente, nenhum critério
 * sumindo em silêncio, limitação conhecida contando contra a métrica, e determinismo.
 */
describe("artefato de eval — invariantes de publicação", () => {
  const artifact = buildEvalArtifact();

  it("carrega a estampa completa: sem ela o número é alegação, não medida", () => {
    const { stamp } = artifact;
    expect(stamp.lucidVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(stamp.localeId).toBe("pt-BR");
    expect(stamp.standardVersion).toBe("ABNT NBR ISO 24495-1:2024");
    expect(stamp.configHash.length).toBeGreaterThan(0);
    expect(stamp.dataHash.length).toBeGreaterThan(0);
    expect(stamp.goldenHash.length).toBeGreaterThan(0);
  });

  it("o goldenHash muda quando o corpus muda — a medição depende do golden, não só do motor", () => {
    // A lacuna que apareceu ao declarar A12a/A12d: o recall publicado caiu e config/dado
    // não mudaram. Sem esta parte da estampa, dois artefatos discordantes seriam
    // indistinguíveis.
    const base = hashGoldens();
    const comEntradaNova = hashGoldens({
      jargon: [...GOLDEN_JARGAO, { texto: "entrada sintética", expectedCount: 1 }],
      nominalization: GOLDEN_NOMINALIZACAO,
      passiveVoice: GOLDEN_VOZ_PASSIVA,
      syllables: GOLDEN_SILABAS,
      integrated: GOLDEN_INTEGRADO,
    });

    expect(base).toBe(artifact.stamp.goldenHash);
    expect(comEntradaNova).not.toBe(base);
  });

  it("a estampa de dado cobre TODOS os datasets, não só os usados pelos evals", () => {
    // Um dataHash escopado aos critérios avaliados afirmaria, por omissão, que o resto do
    // dado não mudou — e mudança em qualquer léxico muda o que a engine faria.
    const todos = Object.keys(REGISTRY).sort() as DatasetId[];
    expect(artifact.stamp.dataHash).toBe(dataHashFor(todos));
    expect(todos.length).toBeGreaterThan(20);
  });

  it("todo critério da engine aparece em exatamente UMA camada de cobertura", () => {
    const { measured, goldenLabelledOnly, unitTestsOnly } = artifact.criteriaCoverage;
    const todos = [...measured, ...goldenLabelledOnly, ...unitTestsOnly];

    expect(todos.length).toBe(CRITERION_IDS.length);
    expect(new Set(todos).size).toBe(CRITERION_IDS.length);
    expect([...todos].sort()).toEqual([...CRITERION_IDS].sort());
  });

  it("a cobertura é DERIVADA dos dados — critério novo sem eval cai em 'só teste unitário'", () => {
    const cobertura = criteriaCoverage();
    // Nenhuma lista escrita à mão: measured são os avaliadores que existem; o resto sai
    // do golden integrado. Se alguém adicionar um critério e esquecer a eval, ele aparece.
    expect(cobertura.measured).toEqual(["passive_voice", "nominalization", "jargon"]);
    expect(cobertura.unitTestsOnly.length).toBeGreaterThan(0);
    expect(cobertura.goldenLabelledOnly).not.toContain("jargon");
  });

  it("cada detector declara cobertura léxica, casos negativos e limitações conhecidas", () => {
    expect(artifact.detectors.length).toBeGreaterThan(0);
    for (const d of artifact.detectors) {
      expect(["curated", "productive"]).toContain(d.coverage);
      // Sem caso negativo, precisão é 100% de graça.
      expect(d.summary.negatives, `${d.criterion} sem casos negativos`).toBeGreaterThan(0);
      expect(d.summary.precision).toBeGreaterThan(0);
      expect(d.summary.precision).toBeLessThanOrEqual(1);
      expect(d.summary.recall).toBeGreaterThan(0);
      expect(d.summary.recall).toBeLessThanOrEqual(1);
      for (const lim of d.knownLimitations) {
        expect(lim.motivo, `limitação sem motivo em ${d.criterion}`).not.toBe("");
      }
    }
  });

  it("limitação conhecida NÃO é excluída da métrica — a precisão publicada é a honesta", () => {
    const comLimitacaoQueFalha = artifact.detectors.filter((d) =>
      d.failures.some((f) => f.estado === "limitacao_conhecida"),
    );
    // Ao menos um detector tem uma limitação que aparece como falha (hoje: jargão, o
    // "Outrossim" nome próprio do A12b). Se um dia isso zerar por exclusão em vez de
    // correção, este teste é o alarme.
    expect(comLimitacaoQueFalha.length).toBeGreaterThan(0);
    for (const d of artifact.detectors) {
      const falhasDeclaradas = d.failures.filter((f) => f.estado === "limitacao_conhecida").length;
      if (falhasDeclaradas > 0) expect(d.summary.fp + d.summary.fn).toBeGreaterThan(0);
    }
  });

  it("os caveats do método viajam no artefato — a página não pode publicar o número sem eles", () => {
    const texto = artifact.method.caveats.join(" ");
    expect(artifact.method.scoring).toBe("count-per-passage");
    expect(texto).toContain("CIRCULAR");
    expect(texto).toContain("contam CONTRA a métrica");
    expect(texto).toContain("Camada 2");
  });

  it("determinístico: duas construções produzem serialização byte-idêntica", () => {
    expect(serializeEvalArtifact(buildEvalArtifact())).toBe(serializeEvalArtifact(buildEvalArtifact()));
  });

  it("sem timestamp: a identidade da rodada é a tripla (versão, config, dado)", () => {
    const json = serializeEvalArtifact(artifact);
    expect(json).not.toMatch(/generatedAt|timestamp/i);
    expect(json).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  it("a convenção de pontuação é a mesma dos evals (contagem por trecho)", () => {
    expect(scoreCounts(1, 1)).toEqual({ tp: 1, fp: 0, fn: 0 });
    expect(scoreCounts(0, 2)).toEqual({ tp: 0, fp: 2, fn: 0 });
    expect(scoreCounts(2, 0)).toEqual({ tp: 0, fp: 0, fn: 2 });
    expect(scoreCounts(1, 2)).toEqual({ tp: 1, fp: 1, fn: 0 });
  });
});
