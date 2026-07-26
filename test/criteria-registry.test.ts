import { describe, expect, it } from "vitest";
import { analyze, CRITERION_IDS } from "../src/lucid";
import type { CriterionId } from "../src/lucid";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { CRITERION_TAXONOMY } from "../src/locales/pt-BR/taxonomy";
import { CRITERION_META, CRITERION_ORDER } from "../src/app/lib/criteria";
import { localePtBR, ptDocumentServices } from "../src/locales/pt-BR";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildStructuredDocument } from "../src/lucid/core/document/structured";
import type { Document, Pass, PassContext } from "../src/lucid/core/types";
import { buildDocument } from "./support/pt";

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("criterion registry (ADR-029)", () => {
  it("CRITERION_IDS has no duplicates", () => {
    expect(sorted(CRITERION_IDS)).toEqual(sorted([...new Set(CRITERION_IDS)]));
  });

  it("PASSES and CRITERION_IDS describe EXACTLY the same set", () => {
    const fromPasses = sorted(PASSES.map((p) => p.criterion));

    expect(fromPasses).toEqual(sorted([...new Set(fromPasses)]));
    expect(fromPasses).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_META covers exactly the CRITERION_IDS (presentation completeness)", () => {
    expect(sorted(Object.keys(CRITERION_META))).toEqual(sorted(CRITERION_IDS));
  });

  it("CRITERION_ORDER is a permutation of CRITERION_IDS (every criterion is ordered, none left over)", () => {
    expect(sorted(CRITERION_ORDER)).toEqual(sorted(CRITERION_IDS));
  });
});

describe("provenance taxonomy (ADR-056)", () => {
  it("CRITERION_TAXONOMY covers exactly the CRITERION_IDS", () => {
    expect(sorted(Object.keys(CRITERION_TAXONOMY))).toEqual(sorted(CRITERION_IDS));
  });

  it("normativeReference exists IF AND ONLY IF source === 'iso-24495-1' (honesty invariant)", () => {
    for (const [id, entry] of Object.entries(CRITERION_TAXONOMY)) {
      const hasRef = "normativeReference" in entry && entry.normativeReference !== undefined;
      expect(hasRef, `${id}: normativeReference must match an iso source`).toBe(entry.source === "iso-24495-1");
    }
  });

  it("no editorial/heuristic criterion is wrongly labeled Relevant or Usable", () => {
    for (const entry of Object.values(CRITERION_TAXONOMY)) {
      expect(["understandable", "findable"]).toContain(entry.principleGroup);
    }
  });

  it("analyze() stamps source/principleGroup consistent with the taxonomy on every finding", () => {
    const diag = analyze(
      "A carta foi escrita pelo funcionário responsável. Vou estar enviando o documento supracitado. " +
        "O trabalho far-se-á sem demora. Não é incomum que isso aconteça.",
    );
    expect(diag.findings.length).toBeGreaterThan(0);
    for (const f of diag.findings) {
      const entry = CRITERION_TAXONOMY[f.criterion as CriterionId];
      expect(entry, `no taxonomy entry for ${f.criterion}`).toBeDefined();
      expect(f.source).toBe(entry.source);
      expect(f.principleGroup).toBe(entry.principleGroup);
      expect(f.normativeReference !== undefined).toBe(f.source === "iso-24495-1");
    }
  });
});

describe("each pass only produces findings with its OWN criterion (buildScore contract)", () => {
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

  it.each(PASSES)("pass '$criterion': every returned finding has criterion === '$criterion'", (pass) => {
    const findings = [...findingsFor(pass, plainDoc), ...findingsFor(pass, structuredDoc)];
    for (const finding of findings) {
      expect(finding.criterion).toBe(pass.criterion);
    }
  });

  it("the synthetic text really exercises most criteria (the check above is not vacuous)", () => {
    const criteriaHit = new Set(
      PASSES.flatMap((pass) => [...findingsFor(pass, plainDoc), ...findingsFor(pass, structuredDoc)]).map(
        (f) => f.criterion,
      ),
    );
    expect(criteriaHit.size).toBeGreaterThanOrEqual(Math.ceil(CRITERION_IDS.length / 2));
  });
});
