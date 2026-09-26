import { describe, expect, it } from "vitest";
import type { Finding } from "@/lucid";
import { analyze } from "@/locales/pt-BR";
import { renderBriefing } from "@/report/rewrite";
import { metaFor } from "@/app/lib/criteria";
import { buildConfidence, detectedProse, detectionHeadline } from "@/app/lib/narrative";
import { copyFor } from "@/app/i18n/copy";

function finding(text: string): Finding {
  const found = analyze(text).findings.find((f) => f.criterion === "nominalization");
  if (!found) throw new Error(`no finding in ${text}`);
  return found;
}

const SINGLE_VERB = finding("É preciso fazer a verificação dos requisitos antes do prazo final.");
const SEVERAL_VERBS = finding("O setor vai fazer a revisão do contrato.");

describe("action with a generic verb — the texts say what the detector found", () => {
  it("names the passage, the generic verb and the noun", () => {
    expect(detectionHeadline(SINGLE_VERB, "pt-BR")).toBe("Com verbo genérico: “fazer a verificação”");
    expect(detectedProse(SINGLE_VERB, "pt-BR")).toBe(
      "Em “fazer a verificação”, a ação está escrita como substantivo (“verificação”) e acompanhada de um verbo " +
        "genérico (“fazer”). Com o verbo correspondente, a frase pode ficar mais direta.",
    );
  });

  it("states the single registered verb as the curated list's, and the ambiguous one as only registered", () => {
    expect(SINGLE_VERB.justification).toBe(
      "“fazer a verificação” usa o verbo genérico “fazer” com a ação escrita como substantivo, “verificação”. " +
        "Pela lista curada do Lucid, esse substantivo corresponde a um único verbo: “verificar”. O Lucid não " +
        "reescreve a frase: ele verifica a sua versão ou a proposta da IA.",
    );
    expect(SEVERAL_VERBS.justification).toBe(
      "“fazer a revisão” usa o verbo genérico “fazer” com a ação escrita como substantivo, “revisão”. Esse " +
        "substantivo pode corresponder a mais de um verbo (o registrado é “revisar”), e só o contexto decide qual.",
    );
    expect(copyFor("pt-BR").guidance.nominalizationBaseVerb("revisar")).toBe(
      "Verbo registrado na lista do Lucid: “revisar”.",
    );
  });

  it("no text claims that the construction hides the action or lengthens the sentence", () => {
    const meta = metaFor("pt-BR", "nominalization");
    const texts = [
      meta.label,
      meta.why,
      meta.signal,
      copyFor("pt-BR").guidance.nominalizationBody,
      ...[SINGLE_VERB, SEVERAL_VERBS].flatMap((f) => [
        detectionHeadline(f, "pt-BR"),
        detectedProse(f, "pt-BR"),
        buildConfidence(f, "pt-BR").rationale,
        f.justification,
      ]),
    ];
    expect(texts.filter((t) => /escond|alonga|sem necessidade|nominaliza|verbo-suporte/iu.test(t))).toEqual([]);
  });

  it("the versioned prompt still names and hints the criterion as before", () => {
    const briefing = renderBriefing([SINGLE_VERB]);

    expect(briefing).toContain("- Nominalização · 1× — Troque substantivos de ação pelos verbos correspondentes.");
  });
});
