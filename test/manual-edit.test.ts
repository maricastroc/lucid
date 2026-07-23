import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { rewriteTargetAt } from "../src/app/lib/paragraphs";
import { verifyManualEdit } from "../src/app/lib/rewrite";
import { isManualEditDirty, manualEditReplacement, spliceSpan } from "../src/app/lib/text-edit";

function manualEditTargetFor(text: string, criterion: string) {
  const d = analyze(text);
  const finding = d.findings.find((f) => f.criterion === criterion);
  if (!finding) throw new Error(`sem finding '${criterion}' em: ${text}`);
  return { source: d.text, ...rewriteTargetAt(d.text, finding.span.start) };
}

describe("manualEditReplacement — apara as pontas, preserva o miolo", () => {
  it("remove espaços/quebras das bordas", () => {
    expect(manualEditReplacement("  minha versão  ")).toBe("minha versão");
    expect(manualEditReplacement("\n  texto \n")).toBe("texto");
  });
  it("não mexe no espaçamento interno", () => {
    expect(manualEditReplacement("uma  frase. Outra.")).toBe("uma  frase. Outra.");
  });
});

describe("isManualEditDirty — só aplica conteúdo real e diferente", () => {
  const original = "A comissão analisou o documento.";
  it("igual ao original (mesmo com espaços nas pontas) → não aplica", () => {
    expect(isManualEditDirty(original, original)).toBe(false);
    expect(isManualEditDirty(original, `  ${original}  `)).toBe(false);
  });
  it("vazio ou só espaços → não aplica (não esvazia o trecho)", () => {
    expect(isManualEditDirty(original, "")).toBe(false);
    expect(isManualEditDirty(original, "   \n ")).toBe(false);
  });
  it("conteúdo diferente → aplica", () => {
    expect(isManualEditDirty(original, "A comissão leu o documento.")).toBe(true);
  });
});

describe("spliceSpan — substitui exatamente o span do alvo", () => {
  it("troca o intervalo e conserva o resto", () => {
    const text = "Olá mundo cruel.";
    const target = { start: 4, end: 9, text: "mundo" };
    expect(spliceSpan(text, target, "planeta")).toBe("Olá planeta cruel.");
  });
});

describe("alvo do ManualEdit = unidade de reescrita do finding", () => {
  it("bloco contínuo (sem linha em branco) → a FRASE do finding", () => {
    const text = "As contas foram aprovadas pelo conselho fiscal da autarquia federal competente.";
    const { source, span, unit } = manualEditTargetFor(text, "passive_voice");
    expect(unit).toBe("sentence");
    expect(span.text).toBe(source.trim());
  });

  it("texto com parágrafos → o PARÁGRAFO do finding, e o resto fica intacto ao aplicar", () => {
    const text =
      "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";
    const { source, span, unit } = manualEditTargetFor(text, "passive_voice");
    expect(unit).toBe("paragraph");
    expect(span.text).toBe("As contas foram aprovadas pelo conselho.");

    const replacement = manualEditReplacement("  O conselho aprovou as contas.  ");
    const next = spliceSpan(source, span, replacement);
    expect(next).toBe("O conselho aprovou as contas.\n\nO pagamento deve ser feito na hipótese de deferimento.");
  });

  it("o loop fecha: a engine reanalisa o resultado da edição à mão", () => {
    const text =
      "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const edited = spliceSpan(source, span, manualEditReplacement("O conselho aprovou as contas."));

    const before = analyze(source).findings.filter((f) => f.criterion === "passive_voice").length;
    const after = analyze(edited).findings.filter((f) => f.criterion === "passive_voice").length;

    expect(after).toBeLessThan(before);
  });
});

describe("verifyManualEdit — a versão do autor é julgada pelo MESMO verificador", () => {
  const text =
    "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";

  it("carimba a proveniência do autor, apara o rascunho e devolve PROVA + métricas, offline (sem sonda de sentido)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { proposal, verification } = await verifyManualEdit(source, span, "  O conselho aprovou as contas.  ");

    expect(proposal.proposerId).toBe("sua edição");
    expect(proposal.proposed).toBe("O conselho aprovou as contas.");
    expect(proposal.original).toBe(span.text);
    expect(verification.proofs.length).toBeGreaterThan(0);
    expect(verification.metrics.wordsBefore).toBeGreaterThan(0);
    expect(verification.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
  });

  it("não referenda o autor: fabricar 1ª pessoa ausente no original é VETADO (mesmo veto da IA)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { verification } = await verifyManualEdit(source, span, "Nós aprovamos as contas na nossa reunião.");

    expect(verification.hasBlockingFailure).toBe(true);
    const firstPerson = verification.proofs.find((p) => p.check === "no_invented_first_person");
    expect(firstPerson?.passed).toBe(false);
  });

  it("edição que só maquia a passiva (não resolve o critério) reprova quando o criterion é passado — regressão", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { verification } = await verifyManualEdit(
      source,
      span,
      "As contas foram devidamente aprovadas pelo conselho.",
      "passive_voice",
    );

    const targetResolved = verification.proofs.find((p) => p.check === "target_resolved");
    expect(targetResolved?.passed).toBe(false);
    expect(verification.hasBlockingFailure).toBe(true);
  });
});

describe("verifyManualEdit — a declaração de agente vale para o autor também (ADR-055)", () => {
  const text = "A decisão foi comunicada ao interessado no processo administrativo em curso.";

  function agentlessPassive() {
    const d = analyze(text);
    const finding = d.findings.find((f) => f.criterion === "passive_voice" && f.requiresHuman)!;
    const span = { start: 0, end: d.text.length, text: d.text };
    return { source: d.text, span, finding };
  }

  it("versão do autor que nomeia o agente declarado → prova declared_agent_present PASSA", async () => {
    const { source, span, finding } = agentlessPassive();
    const { verification } = await verifyManualEdit(
      source,
      span,
      "A comissão comunicou a decisão ao interessado no processo administrativo em curso.",
      undefined,
      [{ span: finding.span, agent: "a comissão" }],
    );

    const proof = verification.proofs.find((p) => p.check === "declared_agent_present");
    expect(proof?.passed).toBe(true);
  });

  it("o autor declarou um agente e escreveu OUTRO → a própria versão dele reprova (nenhuma fonte é privilegiada)", async () => {
    const { source, span, finding } = agentlessPassive();
    const { verification } = await verifyManualEdit(
      source,
      span,
      "O setor comunicou a decisão ao interessado no processo administrativo em curso.",
      undefined,
      [{ span: finding.span, agent: "a comissão" }],
    );

    const proof = verification.proofs.find((p) => p.check === "declared_agent_present");
    expect(proof?.passed).toBe(false);
    expect(verification.hasBlockingFailure).toBe(true);
  });

  it("sem declaração, a prova não existe (comportamento anterior intacto)", async () => {
    const { source, span } = agentlessPassive();
    const { verification } = await verifyManualEdit(source, span, "A decisão foi comunicada ao interessado.");
    expect(verification.proofs.find((p) => p.check === "declared_agent_present")).toBeUndefined();
  });
});
