import { describe, expect, it } from "vitest";
import { verifyRewrite, type Proof, type RewriteVerification } from "../src/report/rewrite";
import { legalReferences } from "../src/locales/pt-BR/fidelity";

const LAW =
  "Art. 7º O prazo de 30 dias previsto no caput do art. 5º e nos §§ 1º e 2º do art. 6º da Lei nº 8.112, de 11 de " +
  "dezembro de 1990, conta do inciso II, alínea a, e gera multa de R$ 1.500,00 ou de 2%.";

async function verify(original: string, proposed: string): Promise<RewriteVerification> {
  return verifyRewrite(
    original,
    { start: 0, end: original.length, text: original },
    {
      proposerId: "test",
      original,
      proposed,
    },
  );
}

function outcome(v: RewriteVerification, check: Proof["check"]): Proof["outcome"] {
  return v.proofs.find((p) => p.check === check)!.outcome;
}

function detail(v: RewriteVerification, check: Proof["check"]): string {
  return v.proofs.find((p) => p.check === check)!.detail;
}

const PRESERVING: readonly [string, string][] = [
  [
    "reorders the clauses",
    "Art. 7º A multa de R$ 1.500,00 ou de 2% vale para o prazo de 30 dias previsto no caput do art. 5º e nos §§ 1º e 2º do art. 6º da Lei nº 8.112, de 11 de dezembro de 1990, contado do inciso II, alínea a.",
  ],
  [
    "splits the sentence",
    "Art. 7º O prazo de 30 dias está previsto no caput do art. 5º e nos §§ 1º e 2º do art. 6º da Lei nº 8.112, de 11 de dezembro de 1990. Ele conta do inciso II, alínea a. A multa é de R$ 1.500,00 ou de 2%.",
  ],
  ["breaks lines inside references", LAW.replace("art. 5º", "art.\n5º").replace("Lei nº 8.112", "Lei nº\n8.112")],
  ["spells out artigo and parágrafo", LAW.replace("art. 5º", "artigo 5º").replace("§§ 1º e 2º", "parágrafos 1º e 2º")],
  ["writes the article as an ordinal word", LAW.replace("art. 5º", "artigo quinto")],
  ["uses the degree sign for the ordinal", LAW.replace("art. 5º", "art. 5°")],
  ["lists the paragraphs one by one", LAW.replace("§§ 1º e 2º", "§ 1º e no § 2º")],
  ["writes the law number without the dots or the nº", LAW.replace("Lei nº 8.112", "Lei 8112")],
  ["adds the year to the law number", LAW.replace("Lei nº 8.112", "Lei nº 8.112/90")],
  ["drops the cents and spaces the percent", LAW.replace("R$ 1.500,00", "R$ 1.500").replace("2%", "2 %")],
  ["writes the percent in words", LAW.replace("2%", "2 por cento")],
  ["adds the number in words to the period", LAW.replace("30 dias", "30 (trinta) dias")],
  ["writes the day as an ordinal", LAW.replace("11 de dezembro", "11º de dezembro")],
  ["uses a list hyphen", `${LAW}\n- conforme o caput do art. 5º.`],
];

const VIOLATING: readonly [string, string, Proof["check"], Proof["outcome"]][] = [
  [
    "drops a reference",
    LAW.replace("previsto no caput do art. 5º e ", "previsto "),
    "references_kept",
    "not_confirmed",
  ],
  ["drops the caput", LAW.replace("no caput do art. 5º", "no art. 5º"), "references_kept", "not_confirmed"],
  ["changes an article", LAW.replace("art. 5º", "art. 4º"), "references_kept", "not_confirmed"],
  ["changes an article (addition side)", LAW.replace("art. 5º", "art. 4º"), "references_added", "addition"],
  ["drops a listed paragraph", LAW.replace("§§ 1º e 2º", "§ 1º"), "references_kept", "not_confirmed"],
  ["changes the inciso", LAW.replace("inciso II", "inciso III"), "references_kept", "not_confirmed"],
  ["drops the alínea", LAW.replace("inciso II, alínea a,", "inciso II"), "references_kept", "not_confirmed"],
  ["changes the law", LAW.replace("Lei nº 8.112", "Lei nº 8.113"), "references_kept", "not_confirmed"],
  ["adds a paragraph", LAW.replace("do art. 6º", "e no § 3º do art. 6º"), "references_added", "addition"],
  ["drops the label", LAW.replace("Art. 7º ", ""), "label_kept", "not_confirmed"],
  ["changes the label", LAW.replace("Art. 7º", "Art. 8º"), "label_kept", "not_confirmed"],
  [
    "moves the label into the sentence",
    `O ${LAW.replace("Art. 7º O", "art. 7º diz que o")}`,
    "label_kept",
    "not_confirmed",
  ],
  ["changes the unit of a period", LAW.replace("30 dias", "30 meses"), "values_kept", "not_confirmed"],
  ["changes the unit of a period (addition side)", LAW.replace("30 dias", "30 meses"), "values_added", "addition"],
  ["changes an amount", LAW.replace("R$ 1.500,00", "R$ 1.600,00"), "values_kept", "not_confirmed"],
  ["drops the currency", LAW.replace("R$ 1.500,00", "1.500,00"), "values_kept", "not_confirmed"],
  ["turns a percentage into points", LAW.replace("2%", "2 pontos"), "values_kept", "not_confirmed"],
  ["adds a period", `${LAW} O pagamento vence em 5 dias.`, "values_added", "addition"],
  ["changes the month of a written date", LAW.replace("dezembro", "novembro"), "written_dates_kept", "not_confirmed"],
  ["changes the year of a written date", LAW.replace("de 1990", "de 1991"), "written_dates_kept", "not_confirmed"],
  [
    "rewrites the written date in digits",
    LAW.replace("11 de dezembro de 1990", "11/12/1990"),
    "written_dates_kept",
    "not_confirmed",
  ],
  ["adds a written date", `${LAW} Vale desde 1º de janeiro de 1991.`, "written_dates_added", "addition"],
  ["adds bold", LAW.replace("2%", "**2%**"), "markup_added", "addition"],
  ["adds a heading", `# Prazo\n${LAW}`, "markup_added", "addition"],
  ["adds a quote", `> ${LAW}`, "markup_added", "addition"],
  ["adds brackets", LAW.replace("2%", "2% [sic]"), "markup_added", "addition"],
];

const NEW_GUARANTEES: readonly Proof["check"][] = [
  "references_kept",
  "references_added",
  "label_kept",
  "values_kept",
  "values_added",
  "written_dates_kept",
  "written_dates_added",
  "markup_added",
];

describe("references, label, values, written dates and markup — mutation battery (ADR-112)", () => {
  it.each(PRESERVING)("%s → every new guarantee is confirmed", async (_, proposed) => {
    const v = await verify(LAW, proposed);
    for (const check of NEW_GUARANTEES) expect(outcome(v, check), `${check}: ${detail(v, check)}`).toBe("confirmed");
  });

  it.each(VIOLATING)("%s → %s is %s", async (_, proposed, check, expected) => {
    const v = await verify(LAW, proposed);
    expect(outcome(v, check), detail(v, check)).toBe(expected);
    expect(v.hasBlockingFailure).toBe(true);
  });
});

describe("the messages say which reference, value or date, and nothing more", () => {
  it("a dropped article", async () => {
    const v = await verify(LAW, LAW.replace("art. 5º", "art. 4º"));
    expect(detail(v, "references_kept")).toBe(
      "A referência «art. 5º» do trecho original não foi encontrada na proposta.",
    );
    expect(detail(v, "references_added")).toBe(
      "A proposta contém a referência «art. 4º», que não aparece explicitamente no trecho original.",
    );
  });

  it("a paragraph that replaced an anaphor", async () => {
    const original = "Na atualização a que se refere o parágrafo anterior, as receitas serão reajustadas.";
    const v = await verify(original, "Na atualização de que trata o § 1º, as receitas serão reajustadas.");
    expect(detail(v, "references_kept")).toBe(
      "O trecho original não cita artigo, parágrafo, inciso, alínea, caput nem norma numerada.",
    );
    expect(detail(v, "references_added")).toBe(
      "A proposta contém a referência «§ 1º», que não aparece explicitamente no trecho original.",
    );
  });

  it("a label that was dropped or changed", async () => {
    expect(detail(await verify(LAW, LAW.replace("Art. 7º ", "")), "label_kept")).toBe(
      "A proposta não começa pelo rótulo «Art. 7º» do trecho original.",
    );
    expect(detail(await verify(LAW, LAW.replace("Art. 7º", "Art. 8º")), "label_kept")).toBe(
      "A proposta começa por «Art. 8º», e o trecho original, por «Art. 7º».",
    );
    expect(detail(await verify("Art.\n19. É vedado.", "Art. 19. É proibido."), "label_kept")).toBe(
      "A proposta começa pelo mesmo rótulo do trecho original: «Art. 19».",
    );
  });

  it("a percentage point that became a percentage", async () => {
    const original = "O percentual será reduzido em 1 ponto percentual ao mês, por um prazo máximo de 40 meses.";
    const v = await verify(original, "O percentual vai diminuir 1% a cada mês, por no máximo 40 meses.");
    expect(detail(v, "values_added")).toBe(
      "A proposta contém o valor «1%», que não aparece com essa unidade no trecho original.",
    );
    expect(outcome(v, "values_kept")).toBe("confirmed");
  });

  it("a written date", async () => {
    const v = await verify(LAW, LAW.replace("11 de dezembro de 1990", "11/12/1990"));
    expect(detail(v, "written_dates_kept")).toBe(
      "A data «11 de dezembro de 1990» do trecho original não foi encontrada por extenso na proposta.",
    );
  });

  it("markup", async () => {
    const v = await verify(LAW, LAW.replace("2%", "**2%**"));
    expect(detail(v, "markup_added")).toBe("A proposta contém marcação que não aparece no trecho original: «**».");
  });
});

describe("legalReferences — the traps the gate found", () => {
  const keys = (text: string) => legalReferences(text).map((m) => m.key);

  it("a conjunction after a listed alínea is not another alínea", () => {
    expect(keys("conta do inciso II, alínea a, e gera multa")).toEqual(["inciso II", "alínea a"]);
    expect(keys("as alíneas a, b e c do inciso I")).toEqual(["inciso I", "alínea a", "alínea b", "alínea c"]);
  });

  it("a number after an article and a comma is not another article unless it continues the list", () => {
    expect(keys("previsto no art. 5º, 30 dias depois")).toEqual(["art 5"]);
    expect(keys("os arts. 4º, 5º e 6º da Lei nº 7.988")).toEqual(["lei 7988", "art 4", "art 5", "art 6"]);
    expect(keys("os arts. 219 a 239 da Lei nº 1.711")).toEqual(["lei 1711", "art 219", "art 239"]);
  });

  it("parágrafo written out is the same reference as §", () => {
    expect(keys("conforme o parágrafo 3º do artigo 165")).toEqual(keys("conforme o § 3º do art. 165"));
  });
});
