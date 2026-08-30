import { describe, expect, it } from "vitest";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { PROMPT_V4_PARTS } from "@/report/rewrite";
import {
  declaredUndetectable,
  detectableRegressions,
  SEMANTIC_REGRESSIONS,
} from "./eval/rewrite-ab/semantic-regressions";

const introducedObligation = (original: string, proposed: string): boolean => {
  const sourceIsDeontic = new RegExp(rewriteLocalePtBR.deonticInSource.source, "iu").test(original);
  if (sourceIsDeontic) return false;
  return new RegExp(rewriteLocalePtBR.deonticIntroduced.source, "iu").test(proposed);
};

describe("regressões de sentido — o que passou pelo placar de provas", () => {
  it("nenhuma delas foi vetada quando aconteceu, e é por isso que estão congeladas", () => {
    expect(SEMANTIC_REGRESSIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("o sinal de dever inventado aponta todas as que se declarou capaz de apontar", () => {
    for (const r of detectableRegressions()) {
      expect(introducedObligation(r.original, r.offending), r.id).toBe(true);
    }
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
    expect(kinds).toContain("category_narrowed");
    expect(kinds).toContain("invented_addressee");
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
