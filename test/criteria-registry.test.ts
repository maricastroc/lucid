import { describe, expect, it } from "vitest";
import { CRITERION_IDS } from "../src/lucid";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { CRITERION_META, CRITERION_ORDER } from "../src/app/lib/criteria";
import { localePtBR, ptDocumentServices } from "../src/locales/pt-BR";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildStructuredDocument } from "../src/lucid/core/document/structured";
import type { Document, Pass, PassContext } from "../src/lucid/core/types";
import { buildDocument } from "./support/pt";

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("registro de critérios (ADR-029)", () => {
  it("CRITERION_IDS não tem duplicatas", () => {
    expect(sorted(CRITERION_IDS)).toEqual(sorted([...new Set(CRITERION_IDS)]));
  });

  it("PASSES e CRITERION_IDS descrevem EXATAMENTE o mesmo conjunto", () => {
    const dosPasses = sorted(PASSES.map((p) => p.criterion));

    expect(dosPasses).toEqual(sorted([...new Set(dosPasses)]));
    expect(dosPasses).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_META cobre exatamente os CRITERION_IDS (completude da apresentação)", () => {
    expect(sorted(Object.keys(CRITERION_META))).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_ORDER é uma permutação de CRITERION_IDS (todo critério é ordenado, sem sobra)", () => {
    expect(sorted(CRITERION_ORDER)).toEqual(sorted(CRITERION_IDS));
  });
});

describe("cada pass só produz findings com o PRÓPRIO criterion (contrato de buildScore)", () => {
  const richText =
    "A carta foi escrita pelo funcionário responsável. Fizemos a análise dos dados do projeto. " +
    "Houve a realização da atualização do sistema imediatamente. O trabalho far-se-á sem demora. " +
    "Isso é o elo de ligação entre as áreas técnicas envolvidas. " +
    "O interessado deverá apresentar os documentos exigidos pela comissão. " +
    "Em primeiro lugar, o processo começa. Em segundo lugar, ele é avaliado. Em terceiro lugar, é aprovado. " +
    "Este projeto tinha sido aprovado fizera muito tempo atrás pelos membros. " +
    "Vou estar enviando o relatório supracitado amanhã de manhã bem cedo. " +
    "Outrossim, o pedido segue destarte para análise, no sentido de facilitar o acesso ao sistema. " +
    "Não é incomum que isso aconteça por aqui. " +
    "Ele resolveu o problema rapidamente, eficientemente e silenciosamente. " +
    "Este é um parágrafo comprido de teste que precisa ultrapassar o limite de vinte palavras para disparar o alerta de frase longa configurado agora.";

  const plainDoc = buildDocument(richText);

  const structuredDoc = buildStructuredDocument(
    [
      { kind: "heading", level: 1, text: "Título" },
      { kind: "heading", level: 3, text: "Subseção que pula um nível inteiro da hierarquia" },
      { kind: "heading", level: 1, text: "Procedimentos de Segurança" },
      { kind: "paragraph", text: "O funcionário deve completar o treinamento anual obrigatório sobre ética." },
      { kind: "list", ordered: false, items: ["Único item da lista"] },
    ],
    ptDocumentServices,
  );

  function findingsFor(pass: Pass, doc: Document) {
    const context: PassContext = Object.freeze({
      doc,
      config: DEFAULT_CONFIG,
      data: localePtBR.data.createDataView(pass.dataDeps ?? []),
    });
    return pass.run(context);
  }

  it.each(PASSES)("pass '$criterion': todo finding devolvido tem criterion === '$criterion'", (pass) => {
    const findings = [...findingsFor(pass, plainDoc), ...findingsFor(pass, structuredDoc)];
    for (const finding of findings) {
      expect(finding.criterion).toBe(pass.criterion);
    }
  });

  it("o texto sintético realmente exercita a maioria dos critérios (a checagem acima não é vazia)", () => {
    const criteriaHit = new Set(
      PASSES.flatMap((pass) => [...findingsFor(pass, plainDoc), ...findingsFor(pass, structuredDoc)]).map(
        (f) => f.criterion,
      ),
    );
    expect(criteriaHit.size).toBeGreaterThanOrEqual(Math.ceil(CRITERION_IDS.length / 2));
  });
});
