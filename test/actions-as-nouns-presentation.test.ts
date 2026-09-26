import { describe, expect, it } from "vitest";
import type { Finding } from "@/lucid";
import { analyze } from "@/locales/pt-BR";
import { criterionLabel, renderBriefing } from "@/report/rewrite";
import { metaFor } from "@/app/lib/criteria";
import { buildConfidence, detectedProse, detectionHeadline } from "@/app/lib/narrative";
import { humanLeadFor } from "@/app/presentation/registry";
import { copyFor } from "@/app/i18n/copy";

const SENTENCE =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo destinado " +
  "à verificação das condições supracitadas exigidas para a concessão do benefício, e a decisão foi comunicada ao " +
  "interessado no processo.";

function finding(text: string, spanText: string): Finding {
  const found = analyze(text).findings.find(
    (f) => f.criterion === "nominalizacao_encadeada" && f.span.text === spanText,
  );
  if (!found) throw new Error(`no finding on ${spanText}`);
  return found;
}

describe("actions written as nouns — the finding names what Lucid counted", () => {
  it("several in the same sentence: the headline lists every counted word", () => {
    const f = finding(SENTENCE, "concessão");

    expect(detectionHeadline(f, "pt-BR")).toBe("3 nesta frase: “análise”, “verificação” e “concessão”");
    expect(detectedProse(f, "pt-BR")).toBe(
      "Esta frase tem 3 ações escritas como substantivo. Este ponto marca “concessão”; “análise” e “verificação” " +
        "aparecem em outros pontos desta frase.",
    );
    expect(f.justification).toBe(
      "“concessão” é uma das 3 ações escritas como substantivo nesta frase: “análise”, “verificação” e " +
        "“concessão”. A partir de 3 na mesma frase, o Lucid marca cada uma para revisão.",
    );
  });

  it("linked to another noun: the headline quotes the passage and the text names both words", () => {
    const f = finding(SENTENCE, "verificação das condições");

    expect(f.severity).toBe("info");
    expect(detectionHeadline(f, "pt-BR")).toBe("Ligada a outro substantivo: “verificação das condições”");
    expect(detectedProse(f, "pt-BR")).toBe(
      "Em “verificação das condições”, a ação “verificação” está escrita como substantivo e vem ligada por “das” " +
        "a outro substantivo, “condições”.",
    );
    expect(f.justification).toBe("“verificação” é uma ação escrita como substantivo, ligada por “das” a “condições”.");
  });

  it("one action linked to another: both actions are named", () => {
    const f = finding(
      "O prazo conta a partir da análise da concessão do benefício pelo órgão.",
      "análise da concessão",
    );

    expect(f.severity).toBe("warning");
    expect(detectionHeadline(f, "pt-BR")).toBe("Uma ligada à outra: “análise da concessão”");
    expect(detectedProse(f, "pt-BR")).toBe(
      "“análise” e “concessão” são ações escritas como substantivo, e aqui uma vem ligada à outra por “da”. Em " +
        "sequência, elas podem tornar a leitura mais abstrata.",
    );
    expect(f.justification).toBe(
      "“análise” e “concessão” são ações escritas como substantivo, ligadas por “da” em “análise da concessão”.",
    );
  });
});

describe("actions written as nouns — the interface speaks without linguistic terms", () => {
  it("names both sibling criteria by what they find", () => {
    expect(metaFor("pt-BR", "nominalizacao_encadeada").label).toBe("Ações escritas como substantivos");
    expect(metaFor("pt-BR", "nominalization").label).toBe("Ação com verbo genérico");
  });

  it("no text shown for this criterion says nominalization, chained or concentrated", () => {
    const findings = [
      finding(SENTENCE, "concessão"),
      finding(SENTENCE, "verificação das condições"),
      finding("O prazo conta a partir da análise da concessão do benefício pelo órgão.", "análise da concessão"),
    ];
    const meta = metaFor("pt-BR", "nominalizacao_encadeada");
    const texts = [
      meta.label,
      meta.why,
      meta.signal,
      humanLeadFor("pt-BR", "nominalizacao_encadeada", "pt-BR") ?? "",
      copyFor("pt-BR").guidance.nominalizacaoEncadeada,
      copyFor("pt-BR").profile.knobChainedNominalization,
      ...findings.flatMap((f) => [
        detectionHeadline(f, "pt-BR"),
        detectedProse(f, "pt-BR"),
        buildConfidence(f, "pt-BR").rationale,
        f.justification,
      ]),
    ];
    expect(texts.filter((t) => /nominaliza|encadead|concentrad/iu.test(t))).toEqual([]);
  });
});

describe("actions written as nouns — the versioned prompt keeps its names", () => {
  it("the verifier uses the interface name, the prompt keeps the name it was versioned with", () => {
    const briefing = renderBriefing([finding(SENTENCE, "concessão")]);

    expect(criterionLabel("nominalizacao_encadeada")).toBe("Ações escritas como substantivos");
    expect(criterionLabel("nominalization")).toBe("Ação com verbo genérico");
    expect(briefing).toContain("Nominalização encadeada");
    expect(briefing).not.toContain("Ações escritas como substantivos");
  });
});
