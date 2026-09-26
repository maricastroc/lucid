import { describe, expect, it } from "vitest";
import { needsAuthorDecision, type Proof, type RewriteVerification, verifyRewrite } from "../src/report/rewrite";

const ORIGINAL =
  "O prazo de 30 dias conta a partir de 10/05/2024, conforme o art. 7º, e uma multa de R$ 1.500,00 incide sobre cada dia de atraso.";

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

function proof(v: RewriteVerification, check: Proof["check"]): Proof {
  return v.proofs.find((p) => p.check === check)!;
}

const RE_NUMBER = /\d[\d.,]*\d|\d/gu;
const RE_DATE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/gu;
const sameSorted = (a: string, b: string, re: RegExp): boolean =>
  JSON.stringify((a.match(re) ?? []).sort()) === JSON.stringify((b.match(re) ?? []).sort());

const NUMBER_LOST: readonly [string, string][] = [
  ["removes a number", ORIGINAL.replace("30 dias", "alguns dias")],
  ["changes a number", ORIGINAL.replace("30 dias", "31 dias")],
  ["changes how a number is written", ORIGINAL.replace("1.500,00", "1500,00")],
  ["drops the article number", ORIGINAL.replace("art. 7º", "artigo citado")],
];

const NUMBER_ADDED: readonly [string, string][] = [
  ["adds a paragraph reference", ORIGINAL.replace("art. 7º", "art. 7º, § 1º")],
  ["turns a written number into digits", ORIGINAL.replace("uma multa", "1 multa")],
  ["repeats a number", `${ORIGINAL} O prazo é de 30 dias.`],
  ["changes a number", ORIGINAL.replace("30 dias", "31 dias")],
];

const NUMBERS_KEPT: readonly [string, string][] = [
  [
    "reorders the clauses",
    "Conforme o art. 7º, o prazo de 30 dias conta a partir de 10/05/2024, e uma multa de R$ 1.500,00 incide sobre cada dia de atraso.",
  ],
  [
    "splits the sentence",
    "O prazo de 30 dias conta a partir de 10/05/2024, conforme o art. 7º. Uma multa de R$ 1.500,00 incide sobre cada dia de atraso.",
  ],
  ["breaks a line inside the sentence", ORIGINAL.replace("conforme o", "conforme\no")],
  [
    "rewords around the numbers",
    ORIGINAL.replace("conta a partir de", "começa em").replace("incide sobre", "vale para"),
  ],
  ["ends a sentence right after a number", ORIGINAL.replace("30 dias conta", "30. Ele conta")],
  ["spells out the article", ORIGINAL.replace("art. 7º", "artigo 7º")],
];

describe("numbers_kept and numbers_added — mutation battery", () => {
  it.each(NUMBER_LOST)("%s → not confirmed", async (_, proposed) => {
    const v = await verify(ORIGINAL, proposed);
    expect(proof(v, "numbers_kept").outcome).toBe("not_confirmed");
    expect(needsAuthorDecision(v)).toBe(true);
  });

  it.each(NUMBER_ADDED)("%s → addition", async (_, proposed) => {
    const v = await verify(ORIGINAL, proposed);
    expect(proof(v, "numbers_added").outcome).toBe("addition");
    expect(needsAuthorDecision(v)).toBe(true);
  });

  it.each(NUMBERS_KEPT)("%s → both confirmed", async (_, proposed) => {
    const v = await verify(ORIGINAL, proposed);
    expect(proof(v, "numbers_kept").outcome).toBe("confirmed");
    expect(proof(v, "numbers_added").outcome).toBe("confirmed");
  });

  it("blocks exactly where the single multiset comparison blocked before the split", async () => {
    for (const [, proposed] of [...NUMBER_LOST, ...NUMBER_ADDED, ...NUMBERS_KEPT]) {
      const v = await verify(ORIGINAL, proposed);
      const splitPasses = proof(v, "numbers_kept").passed && proof(v, "numbers_added").passed;
      expect(splitPasses, proposed).toBe(sameSorted(ORIGINAL, proposed, RE_NUMBER));
    }
  });

  it("names the digits a written number became, as the author asked", async () => {
    const v = await verify(ORIGINAL, ORIGINAL.replace("uma multa", "1 multa"));
    expect(proof(v, "numbers_added").detail).toBe(
      "A proposta contém o número «1», que não aparece em algarismos no trecho original.",
    );
  });

  it("names a reference that lost its number", async () => {
    const v = await verify(ORIGINAL, ORIGINAL.replace("art. 7º", "artigo citado"));
    expect(proof(v, "numbers_kept").detail).toBe(
      "O número «7» do trecho original não foi encontrado na proposta com a mesma grafia.",
    );
  });

  it("says when the same digits are only written differently", async () => {
    const v = await verify(ORIGINAL, ORIGINAL.replace("1.500,00", "1500,00"));
    expect(proof(v, "numbers_kept").detail).toBe(
      "O número «1.500,00» do trecho original não foi encontrado na proposta com a mesma grafia.",
    );
    expect(proof(v, "numbers_added").detail).toBe(
      "A proposta escreve «1500,00», que no trecho original aparece como «1.500,00».",
    );
  });

  it("counts repeated numbers in both directions", async () => {
    const twice = `${ORIGINAL} O prazo é de 30 dias.`;
    const more = await verify(ORIGINAL, twice);
    expect(proof(more, "numbers_added").detail).toBe("«30» aparece 2 vezes na proposta e 1 vez no trecho original.");
    expect(proof(more, "numbers_kept").outcome).toBe("confirmed");

    const fewer = await verify(twice, ORIGINAL);
    expect(proof(fewer, "numbers_kept").detail).toBe("«30» aparece 2 vezes no trecho original e 1 vez na proposta.");
    expect(proof(fewer, "numbers_added").outcome).toBe("confirmed");
  });

  it("does not apply when there are no digits, and says so", async () => {
    const original = "O prazo conta a partir do pedido, e uma multa incide sobre cada dia de atraso.";
    const none = await verify(original, "O prazo conta do pedido, e há multa por dia de atraso.");
    expect(proof(none, "numbers_kept")).toMatchObject({
      outcome: "not_applicable",
      passed: true,
      detail: "O trecho original não tem número em algarismos.",
    });
    expect(proof(none, "numbers_added")).toMatchObject({
      outcome: "not_applicable",
      detail: "A proposta não tem número em algarismos.",
    });

    const added = await verify(original, "O prazo conta do pedido, e há 1 multa por dia de atraso.");
    expect(proof(added, "numbers_kept").outcome).toBe("not_applicable");
    expect(proof(added, "numbers_added").outcome).toBe("addition");
  });
});

const DATE_LOST: readonly [string, string][] = [
  ["removes the date", ORIGINAL.replace("a partir de 10/05/2024", "a partir do pedido")],
  ["changes the date", ORIGINAL.replace("10/05/2024", "11/05/2024")],
  ["changes the separator", ORIGINAL.replace("10/05/2024", "10-05-2024")],
  ["writes the date out", ORIGINAL.replace("10/05/2024", "10 de maio de 2024")],
];

describe("dates_kept and dates_added — mutation battery", () => {
  it.each(DATE_LOST)("%s → not confirmed", async (_, proposed) => {
    const v = await verify(ORIGINAL, proposed);
    expect(proof(v, "dates_kept").outcome).toBe("not_confirmed");
  });

  it.each(NUMBERS_KEPT)("%s → both confirmed", async (_, proposed) => {
    const v = await verify(ORIGINAL, proposed);
    expect(proof(v, "dates_kept").outcome).toBe("confirmed");
    expect(proof(v, "dates_added").outcome).toBe("confirmed");
  });

  it("blocks exactly where the single multiset comparison blocked before the split", async () => {
    for (const [, proposed] of [...DATE_LOST, ...NUMBERS_KEPT, ...NUMBER_ADDED]) {
      const v = await verify(ORIGINAL, proposed);
      const splitPasses = proof(v, "dates_kept").passed && proof(v, "dates_added").passed;
      expect(splitPasses, proposed).toBe(sameSorted(ORIGINAL, proposed, RE_DATE));
    }
  });

  it("a new date is an addition, never a lost one", async () => {
    const v = await verify(ORIGINAL, `${ORIGINAL} A multa vale até 31/12/2024.`);
    expect(proof(v, "dates_kept").outcome).toBe("confirmed");
    expect(proof(v, "dates_added")).toMatchObject({
      outcome: "addition",
      detail: "A proposta contém a data «31/12/2024», que não aparece com essa grafia no trecho original.",
    });
  });

  it("does not apply to a date written out, which the written-date proof covers instead", async () => {
    const original = "O prazo conta a partir de 10 de maio de 2024.";
    const v = await verify(original, "O prazo conta a partir de 10 de junho de 2024.");
    expect(proof(v, "dates_kept")).toMatchObject({
      outcome: "not_applicable",
      detail: "O trecho original não tem data escrita só com algarismos, como 10/05/2024.",
    });
    expect(proof(v, "numbers_kept").outcome).toBe("confirmed");
    expect(proof(v, "written_dates_kept")).toMatchObject({
      outcome: "not_confirmed",
      detail: "A data «10 de maio de 2024» do trecho original não foi encontrada por extenso na proposta.",
    });
  });
});
