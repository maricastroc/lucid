import { describe, expect, it } from "vitest";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { PROMPT_V4_PARTS } from "@/report/rewrite";
import {
  declaredUndetectable,
  detectableRegressions,
  SEMANTIC_REGRESSIONS,
} from "./eval/rewrite-ab/semantic-regressions";

const categoryNarrowed = (original: string, proposed: string): boolean => {
  const strip = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase();
  const folded = strip(proposed);
  return [...original.matchAll(new RegExp(rewriteLocalePtBR.legalCategories.source, "giu"))].some(
    (m) => !folded.includes(strip(m[0])),
  );
};

const detects = (r: { kind: string; original: string; offending: string }): boolean =>
  r.kind === "invented_obligation"
    ? introducedObligation(r.original, r.offending)
    : r.kind === "category_narrowed"
      ? categoryNarrowed(r.original, r.offending)
      : false;

const introducedObligation = (original: string, proposed: string): boolean => {
  const sourceIsDeontic = new RegExp(rewriteLocalePtBR.deonticInSource.source, "iu").test(original);
  if (sourceIsDeontic) return false;
  return new RegExp(rewriteLocalePtBR.deonticIntroduced.source, "iu").test(proposed);
};

describe("regressões de sentido — o que passou pelo placar de provas", () => {
  it("nenhuma delas foi vetada quando aconteceu, e é por isso que estão congeladas", () => {
    expect(SEMANTIC_REGRESSIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("os sinais apontam todas as regressões que se declarou capaz de apontar", () => {
    for (const r of detectableRegressions()) {
      expect(detects(r), r.id).toBe(true);
    }
  });

  it("a categoria jurídica é curada: cala quando a reescrita a mantém", () => {
    expect(
      categoryNarrowed(
        "Os saldos das concessionárias de serviços públicos de energia elétrica",
        "Os saldos das concessionárias de serviços públicos de energia elétrica serão aprovados.",
      ),
    ).toBe(false);
    expect(categoryNarrowed("Os saldos das empresas de energia elétrica", "Os saldos das empresas")).toBe(false);
  });

  it("não acusa a descrição original de impor dever", () => {
    for (const r of SEMANTIC_REGRESSIONS) {
      expect(introducedObligation(r.original, r.original), r.id).toBe(false);
    }
  });

  it("cala quando a fonte já impõe dever — traduzir «deverá» por «deve» não é inventar", () => {
    expect(
      introducedObligation("O requerente deverá enviar o documento.", "O requerente deve enviar o documento."),
    ).toBe(false);
    expect(introducedObligation("priorizar-se-á dotação para o pagamento", "deve-se priorizar a verba")).toBe(false);
  });

  it("cala quando a reescrita não impõe dever nenhum", () => {
    expect(
      introducedObligation(
        "As estimativas de receita serão atualizadas.",
        "As estimativas serão atualizadas todo mês.",
      ),
    ).toBe(false);
  });
});

describe("regressões de sentido — o que a engine NÃO apanha, declarado", () => {
  it("as três famílias sem detecção continuam nomeadas, com o motivo", () => {
    const kinds = new Set(declaredUndetectable().map((r) => r.kind));

    expect(kinds).toContain("reservation_scope");
    expect(kinds).toContain("invented_addressee");
    expect(kinds).not.toContain("category_narrowed");
    for (const r of declaredUndetectable()) expect(r.why.length).toBeGreaterThan(40);
  });

  it("o escopo da ressalva não é decidível por presença de marcador — é por isso que não virou prova", () => {
    const invertida = SEMANTIC_REGRESSIONS.find((r) => r.id === "l8016-ressalva-invertida")!;
    const MARCADOR = /\b(ressalvad[oa]s?|sem\s+prejuízo|salvo|excet[ou]|não\s+vale)\b/iu;

    expect(MARCADOR.test(invertida.offending)).toBe(true);
  });

  it("o prompt cobre por escrito o que a verificação não cobre", () => {
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("RESSALVA E EXCEÇÃO");
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("DESCREVER NÃO É OBRIGAR");
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("O NOME DA CATEGORIA");
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("NÃO DIVIDA");
  });
});
