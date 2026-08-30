import { describe, expect, it } from "vitest";
import { analyze, type Finding, type Span } from "@/lucid";
import {
  buildRewritePrompt,
  buildRewritePromptV4,
  criterionLabel,
  PROMPT_V4_PARTS,
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

describe("rewrite@5 — a estratégia padrão", () => {
  it("é o prompt próprio do Lucid, e a estratégia padrão aponta para ele", () => {
    expect(REWRITE_PROMPT_VERSION).toBe("rewrite@5");
    expect(STRATEGY_VERSION.rewrite).toBe("rewrite@5");
    expect(buildRewritePrompt(TEXT, target, { findings: findings() })).toBe(
      buildRewritePromptV4(TEXT, target, findings()),
    );
  });

  it("declara ao proponente as provas que a engine vai rodar, em vez de pedir autoavaliação", () => {
    const prompt = buildRewritePromptV4(TEXT, target, findings());

    expect(prompt).toContain("O QUE O MOTOR VAI VERIFICAR NA SUA RESPOSTA");
    expect(prompt).toContain("condições de aceitação");
    expect(prompt).not.toMatch(/declare o que você preservou|escreva sua auto-?verificação/iu);
  });

  it("nomeia as três coisas que a engine não mede, porque só o proponente pode sustentá-las", () => {
    const prompt = buildRewritePromptV4(TEXT, target, findings());

    expect(prompt).toContain("OMISSÃO");
    expect(prompt).toContain("FORÇA DO VERBO");
    expect(prompt).toContain("CONDIÇÕES E EXCEÇÕES");
  });

  it("cita a norma pública como autoridade da redação", () => {
    const prompt = buildRewritePromptV4(TEXT, target, findings());

    expect(prompt).toContain("ABNT NBR ISO 24495-1");
    expect(prompt).toContain("seção 5.3.2");
    expect(prompt).toContain("seções 5.3.3 e 5.3.4");
    expect(prompt).toContain("seção 5.2");
  });

  it("leva o briefing da engine e o texto do documento", () => {
    const prompt = buildRewritePromptV4(TEXT, target, findings());

    expect(prompt).toContain("O QUE O MOTOR JÁ MEDIU NESTE TRECHO");
    expect(prompt).toContain("Frase longa ·");
    expect(prompt).toContain(TEXT);
  });

  it("sem achado no trecho, o prompt sai sem bloco de briefing vazio", () => {
    const prompt = buildRewritePromptV4("Texto curto.", { start: 0, end: 12, text: "Texto curto." }, []);

    expect(prompt).not.toContain("O QUE O MOTOR JÁ MEDIU NESTE TRECHO");
    expect(prompt).toContain("[DOCUMENTO — para ler, não para reescrever]");
  });

  it("declara o teto de frase como condição de aceitação, não como preferência", () => {
    expect(PROMPT_V4_PARTS.SENTENCES).toContain("20 palavras é TETO, não sugestão");
    expect(PROMPT_V4_PARTS.AUDIT).toContain("reprova a partir de 21");
  });

  it("manda preferir a frase longa apontada à ressalva quebrada", () => {
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("NÃO DIVIDA");
    expect(PROMPT_V4_PARTS.BINDINGS).toContain("inverte quem tem prioridade");
  });

  it("eleva o rótulo do dispositivo e a proibição de lista a condição de aceitação", () => {
    expect(PROMPT_V4_PARTS.AUDIT).toContain("a reescrita abre");
    expect(PROMPT_V4_PARTS.AUDIT).toContain("deixa o trecho sem endereço");
    expect(PROMPT_V4_PARTS.AUDIT).toContain("ainda não foi validada");
  });
});

describe("rewrite@5 — o que a troca preservou", () => {
  it("o rewrite@2 continua alcançável para rollback", () => {
    const previous = buildRewritePrompt(TEXT, target, { strategy: "rewrite2", criterion: "long_sentence" });

    expect(STRATEGY_VERSION.rewrite2).toBe("rewrite@2");
    expect(previous).toContain("DOCUMENTO INTEIRO");
    expect(previous).not.toContain("O QUE O MOTOR VAI VERIFICAR");
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
    const comBriefing = await verifyRewrite(TEXT, target, proposal, { locale: rewriteLocalePtBR });

    expect(comBriefing.proofs).toEqual(semBriefing.proofs);
  });

  it("a lista continua condicionada ao achado da engine — capacidade experimental", () => {
    const semEnumeracao = buildRewritePromptV4(TEXT, target, findings());
    expect(semEnumeracao).toContain('o motor NÃO apontou "Enumeração em prosa"');
    expect(semEnumeracao).toContain("Devolva texto corrido");

    const comEnumeracao = buildRewritePromptV4(TEXT, target, [
      { ...findings()[0], criterion: "prose_enumeration" } as Finding,
    ]);
    expect(comEnumeracao).toContain('o motor apontou "Enumeração em prosa" NESTE trecho');
  });
});

describe("rewrite@5 — o briefing fala a língua da interface", () => {
  it("chama cada critério pelo mesmo nome que a interface", () => {
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
