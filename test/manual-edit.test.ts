/**
 * Edição À MÃO do autor (terceira via do cartão de revisão, ao lado da ação mecânica e da LLM).
 * O componente `ManualEdit` é cola fina sobre lógica pura — testada aqui, no estilo do resto da
 * suíte (sem render). Cobre o CONTRATO que a UI depende:
 *   1. o alvo editável é a UNIDADE de reescrita (frase OU parágrafo) do finding — a mesma que a LLM usa;
 *   2. aplicar substitui EXATAMENTE esse span (via `spliceSpan`, o mesmo `replaceSpan` do studio);
 *   3. a guarda `isManualEditDirty` recusa vazio e no-op; `manualEditReplacement` apara as pontas.
 * A engine reanalisa o resultado — isto é o que fecha o loop "editou → re-mede".
 */
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { rewriteTargetAt } from "../src/app/lib/paragraphs";
import { verifyManualEdit } from "../src/app/lib/rewrite";
import { isManualEditDirty, manualEditReplacement, spliceSpan } from "../src/app/lib/text-edit";

/** O alvo que o ManualEdit abre para um finding: `rewriteTargetAt(source, finding.span.start)`. */
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
    // o alvo é a frase inteira que contém a passiva — não só o trecho «foram aprovadas».
    expect(span.text).toBe(source.trim());
  });

  it("texto com parágrafos → o PARÁGRAFO do finding, e o resto fica intacto ao aplicar", () => {
    const text =
      "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";
    const { source, span, unit } = manualEditTargetFor(text, "passive_voice");
    expect(unit).toBe("paragraph");
    expect(span.text).toBe("As contas foram aprovadas pelo conselho.");

    // aplicar a versão do autor troca só o parágrafo-alvo; o segundo parágrafo permanece.
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
    // reescrevendo a passiva na ativa à mão, a marca de voz passiva daquele parágrafo some.
    expect(after).toBeLessThan(before);
  });
});

/**
 * ADR-000 · Etapa 2 — o verificador é AGNÓSTICO à fonte. A versão do autor (edição à mão ou
 * colagem) passa pelo MESMO `verifyRewrite` que julga a IA — sem proposer e sem rede — e é
 * julgada com o mesmo rigor: não há referendo do humano.
 */
describe("verifyManualEdit — a versão do autor é julgada pelo MESMO verificador", () => {
  const text =
    "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";

  it("carimba a proveniência do autor, apara o rascunho e devolve PROVA + métricas, offline (sem sonda de sentido)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { proposal, verification } = await verifyManualEdit(source, span, "  O conselho aprovou as contas.  ");

    expect(proposal.proposerId).toBe("sua edição");
    expect(proposal.proposed).toBe("O conselho aprovou as contas."); // aparado por manualEditReplacement
    expect(proposal.original).toBe(span.text);
    expect(verification.proofs.length).toBeGreaterThan(0);
    expect(verification.metrics.wordsBefore).toBeGreaterThan(0);
    // o caminho do autor NÃO roda a sonda (único passo com LLM) → sem o sinal de sentido.
    expect(verification.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
  });

  it("não referenda o autor: fabricar 1ª pessoa ausente no original é VETADO (mesmo veto da IA)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { verification } = await verifyManualEdit(source, span, "Nós aprovamos as contas na nossa reunião.");

    expect(verification.hasBlockingFailure).toBe(true);
    const firstPerson = verification.proofs.find((p) => p.check === "no_invented_first_person");
    expect(firstPerson?.passed).toBe(false);
  });
});
