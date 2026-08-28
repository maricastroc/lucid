import { describe, expect, it } from "vitest";
import { analyze, type Finding, type Span } from "@/lucid";
import {
  buildRewritePrompt,
  buildRewritePromptV3,
  criterionLabel,
  IARIS_SOURCE,
  INCOMPATIBLE,
  PATCHED,
  renderBriefing,
  REWRITE_PROMPT_VERSION,
  STRATEGY_VERSION,
  verifyRewrite,
} from "@/report/rewrite";
import { CRITERION_ORDER, metaFor } from "@/app/lib/criteria";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";

const TEXT =
  "Art. 1º Para atendimento da nova composição do Tribunal Superior do Trabalho são criados, no Quadro de " +
  "Pessoal de sua Secretaria, Cargos em Comissão e de Categorias Funcionais, na forma do Anexo I desta Lei.";

const target: Span = { start: 0, end: TEXT.length, text: TEXT };
const findings = (): readonly Finding[] => analyze(TEXT).findings;

describe("rewrite@3 — o que a estratégia padrão passou a ser", () => {
  it("a estratégia padrão é o rewrite@3 e carimba a proveniência", () => {
    expect(REWRITE_PROMPT_VERSION).toBe("rewrite@3");
    expect(STRATEGY_VERSION.rewrite).toBe("rewrite@3");
    expect(buildRewritePrompt(TEXT, target, { findings: findings() })).toBe(
      buildRewritePromptV3(TEXT, target, findings()),
    );
  });

  it("leva o briefing da engine e o núcleo de fidelidade da IAris", () => {
    const prompt = buildRewritePromptV3(TEXT, target, findings());
    expect(prompt).toContain("BRIEFING DA ENGINE DETERMINÍSTICA");
    expect(prompt).toContain("Frase longa ·");
    expect(prompt).toContain("PRINCÍPIO INVIOLÁVEL: FIDELIDADE");
    expect(prompt).toContain("REGRA 1 — VOCABULÁRIO");
    expect(prompt).toContain(TEXT);
  });

  it("sem achado no trecho, o prompt sai sem bloco de briefing vazio", () => {
    const prompt = buildRewritePromptV3("Texto curto.", { start: 0, end: 12, text: "Texto curto." }, []);
    expect(prompt).not.toContain("BRIEFING DA ENGINE DETERMINÍSTICA");
    expect(prompt).toContain("[CONTEXTO DO DOCUMENTO");
  });
});

describe("rewrite@3 — o que a promoção preservou", () => {
  it("o rewrite@2 continua alcançável para rollback, byte a byte", () => {
    const previous = buildRewritePrompt(TEXT, target, { strategy: "rewrite2", criterion: "long_sentence" });
    expect(STRATEGY_VERSION.rewrite2).toBe("rewrite@2");
    expect(previous).toContain("DOCUMENTO INTEIRO");
    expect(previous).not.toContain("PRINCÍPIO INVIOLÁVEL");
    expect(previous).not.toContain("BRIEFING DA ENGINE");
  });

  it("as sete provas determinísticas continuam as mesmas, e uma falha ainda veta", async () => {
    const verification = await verifyRewrite(
      TEXT,
      target,
      { proposerId: "t", original: TEXT, proposed: "O Tribunal terá cargos novos, conforme o Anexo desta Lei." },
      { locale: rewriteLocalePtBR, criterion: "long_sentence" },
    );
    expect(verification.proofs.map((p) => p.check).sort()).toEqual([
      "dates_preserved",
      "no_invented_first_person",
      "no_new_findings",
      "no_new_jargon",
      "numbers_preserved",
      "region_improved",
      "target_resolved",
    ]);
    expect(verification.proofs.find((p) => p.check === "numbers_preserved")?.passed).toBe(false);
    expect(verification.hasBlockingFailure).toBe(true);
  });

  it("o briefing é insumo do prompt e NUNCA entra na verificação", async () => {
    const proposal = { proposerId: "t", original: TEXT, proposed: TEXT };
    const semBriefing = await verifyRewrite(TEXT, target, proposal, { locale: rewriteLocalePtBR });
    const comBriefing = await verifyRewrite(TEXT, target, proposal, {
      locale: rewriteLocalePtBR,
    });
    expect(comBriefing.proofs).toEqual(semBriefing.proofs);
  });

  it("a lista continua condicionada ao achado da engine — capacidade experimental", () => {
    const semEnumeracao = buildRewritePromptV3(TEXT, target, findings());
    expect(semEnumeracao).toContain('a engine NÃO apontou "Enumeração em prosa"');
    expect(semEnumeracao).toContain("devolva texto corrido");

    const comEnumeracao = buildRewritePromptV3(TEXT, target, [
      { ...findings()[0], criterion: "prose_enumeration" } as Finding,
    ]);
    expect(comEnumeracao).toContain('a engine apontou "Enumeração em prosa" NESTE trecho');
  });
});

describe("rewrite@3 — proveniência declarada", () => {
  it("nomeia a fonte, a versão e o fingerprint", () => {
    expect(IARIS_SOURCE.version).toBe("v20");
    expect(IARIS_SOURCE.fingerprint).toBe("a63f8579e819");
    expect(INCOMPATIBLE.length).toBeGreaterThan(0);
    expect(PATCHED.length).toBeGreaterThan(0);
  });

  it("o briefing chama cada critério pelo mesmo nome que a interface", () => {
    for (const criterion of CRITERION_ORDER) {
      expect(criterionLabel(criterion), criterion).toBe(metaFor(criterion).label);
    }
  });

  it("uma linha por critério, com a marca do que exige julgamento", () => {
    const rendered = renderBriefing(findings());
    expect(rendered.split("\n").length).toBe(new Set(findings().map((f) => f.criterion)).size);
    expect(rendered).toContain("este ponto exige julgamento");
  });
});
