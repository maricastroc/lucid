import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: createDataView([]) };
}

function passiveFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return passiveVoicePass.run(ctxFor(text, config));
}

describe("passiveVoicePass — simple forms of ser", () => {
  it.each([
    "é",
    "são",
    "era",
    "eram",
    "foi",
    "foram",
    "será",
    "serão",
    "seria",
    "seriam",
    "seja",
    "sejam",
    "fosse",
    "fossem",
  ])("detects the passive with the form '%s' + a regular participle", (form) => {
    const findings = passiveFindings(`Isso ${form} aprovado pela equipe.`);
    expect(findings).toHaveLength(1);
  });

  it("detects the infinitive 'ser' followed directly by the participle", () => {
    const findings = passiveFindings("O projeto vai ser analisado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("ser analisado");
  });

  it("detects 'sido' and the span covers the whole phrase, including the auxiliary (A-12e)", () => {
    const findings = passiveFindings("O projeto tinha sido aprovado pelo conselho.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("tinha sido aprovado pelo conselho.");
  });

  it("detects 'sendo' (gerund), including the auxiliary in the span (A-12e)", () => {
    const findings = passiveFindings("O prédio está sendo construído pela prefeitura.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("está sendo construído pela prefeitura.");
  });

  it("the walk-back only happens with a recognized adjacent auxiliary — a loose 'sido' keeps the span at the anchor", () => {
    const findings = passiveFindings("O projeto, sido aprovado, seguiu adiante.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("sido aprovado");
  });
});

describe("passiveVoicePass — gender and number of the regular participle", () => {
  it.each([
    ["O pedido foi aprovado.", "aprovado"],
    ["A proposta foi aprovada.", "aprovada"],
    ["Os pedidos foram aprovados.", "aprovados"],
    ["As propostas foram aprovadas.", "aprovadas"],
  ])("detects the inflected form in '%s'", (text) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — irregular participles", () => {
  it.each([
    ["O texto foi escrito pelo autor.", true],
    ["A carta foi feita ontem.", false],
    ["Os documentos foram vistos pela equipe.", true],
    ["O caso foi posto em pauta.", false],
    ["A conta foi paga.", false],
    ["O réu foi preso pela polícia.", true],
    ["O prazo foi dado pelo juiz.", true],
  ])("detects the irregular participle in '%s'", (text, hasAgent) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent });
  });
});

describe("passiveVoicePass — an adverb between auxiliary and participle", () => {
  it("accepts an -mente adverb", () => {
    const findings = passiveFindings("Os pedidos foram rapidamente aprovados.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foram rapidamente aprovados");
  });

  it("accepts an adverb from the closed list of safe connectors", () => {
    const findings = passiveFindings("O pedido foi também aprovado.");
    expect(findings).toHaveLength(1);
  });

  it("accepts up to two connectors in a row", () => {
    const findings = passiveFindings("O pedido foi ainda também aprovado.");
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — negation", () => {
  it("'não' before the auxiliary does not affect detection", () => {
    const findings = passiveFindings("O relatório não foi entregue.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi entregue");
  });

  it("'não' between auxiliary and participle is an accepted connector", () => {
    const findings = passiveFindings("O pedido foi não aprovado, mas sim rejeitado.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].span.text).toBe("foi não aprovado");
  });
});

describe("passiveVoicePass — agent with pelo/pela/pelos/pelas", () => {
  it.each([
    ["O pedido foi aprovado pelo diretor.", "pelo"],
    ["A proposta foi rejeitada pela comissão.", "pela"],
    ["Os relatórios foram entregues pelos servidores.", "pelos"],
    ["As contas foram analisadas pelas auditoras.", "pelas"],
  ])("recognizes the agent introduced in '%s'", (text) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: true });
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("'por' + a bare common noun (an adjunct) does NOT count as an agent", () => {
    for (const text of [
      "O pedido foi aprovado por conveniência.",
      "O pedido foi aprovado por unanimidade.",
      "A multa foi aplicada por lei.",
      "O relatório foi entregue por engano.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: false });
      expect(findings[0].requiresHuman, text).toBe(true);
    }
  });

  it("'por' + proper noun/pronoun/indefinite determiner IS an explicit agent (F2)", () => {
    for (const text of [
      "O documento foi assinado por João.",
      "O pedido foi aprovado por ele.",
      "A carta foi escrita por mim.",
      "A decisão foi tomada por uma comissão.",
      "O contrato foi assinado por Maria Silva.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings, text).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: true });
      expect(findings[0].requiresHuman, text).toBe(false);
    }
  });

  it("'por' + a known adjunct head ('por telefone') is not an agent", () => {
    const findings = passiveFindings("O aviso foi transmitido por telefone.");
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: false });
  });

  it("the idioms 'pelo menos'/'pelo visto'/'pelo contrário' do not count as an agent", () => {
    for (const text of [
      "O pedido foi aprovado pelo menos em parte.",
      "O pedido foi aprovado, pelo visto, sem ressalvas.",
      "O pedido não foi aprovado, pelo contrário.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].meta).toMatchObject({ hasAgent: false });
    }
  });

  it("temporal/locative/idiomatic adjuncts after 'pela/pelo' do NOT count as an agent (A4)", () => {
    for (const text of [
      "O documento foi assinado pela manhã.",
      "O carro foi visto pela janela.",
      "A obra foi concluída pela metade.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].meta).toMatchObject({ hasAgent: false });
      expect(findings[0].requiresHuman).toBe(true);
    }
  });

  it("a real institutional agent is still recognized (no regression from A4)", () => {
    const findings = passiveFindings("O pedido foi aprovado pelo diretor.");
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: true });
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("the agent span stops at the end of the noun phrase, without swallowing the following temporal adjunct (M2)", () => {
    const findings = passiveFindings("O contrato foi assinado pelo diretor ontem à tarde.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi assinado pelo diretor");
    expect(findings[0].meta).toMatchObject({ hasAgent: true, agentTruncated: false });
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("a genitive continuation of the agent ('diretor da empresa') is not cut by the adjunct boundary (M2)", () => {
    const findings = passiveFindings("O contrato foi assinado pelo diretor da empresa ontem.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi assinado pelo diretor da empresa");
  });
});

describe("passiveVoicePass — omitted agent", () => {
  it("with no 'pelo/pela/pelos/pelas', requiresHuman is true and there is no suggestion", () => {
    const findings = passiveFindings("O pedido foi aprovado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].requiresHuman).toBe(true);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].severity).toBe("warning");
  });
});

describe("passiveVoicePass — exact offsets", () => {
  it("the span reconstructs the excerpt exactly by slicing the original text", () => {
    const text = "O texto foi aprovado, mas o outro foi rejeitado.";
    const doc = buildDocument(text);
    const findings = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(2);
    for (const finding of findings) {
      expect(doc.source.slice(finding.span.start, finding.span.end)).toBe(finding.span.text);
    }
    expect(findings[0].span).toEqual({ start: 8, end: 20, text: "foi aprovado" });
    expect(findings[1].span).toEqual({ start: 34, end: 47, text: "foi rejeitado" });
  });

  it("a span with an agent includes the agentive phrase up to the next barrier", () => {
    const text = "Isso foi feito pelo comitê.";
    const doc = buildDocument(text);
    const findings = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi feito pelo comitê.");
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("passiveVoicePass — more than one passive in the document", () => {
  it("detects passives in different sentences", () => {
    const text = "O pedido foi aprovado. A proposta foi rejeitada pela comissão.";
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.meta?.hasAgent)).toEqual([false, true]);
  });

  it("detects two passives in the same sentence, separated by a conjunction", () => {
    const text = "O texto foi aprovado, mas o outro foi rejeitado.";
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(2);
  });
});

describe("passiveVoicePass — no detection in active sentences", () => {
  it.each([
    "O diretor aprovou o pedido.",
    "A comissão rejeitou a proposta.",
    "Os servidores entregaram os relatórios.",
  ])("'%s' yields no finding", (text) => {
    expect(passiveFindings(text)).toEqual([]);
  });
});

describe("passiveVoicePass — no detection with estar/ficar", () => {
  it.each(["A porta está fechada.", "O prédio ficou destruído.", "As contas estão pagas."])(
    "'%s' yields no finding (estar/ficar are out of scope)",
    (text) => {
      expect(passiveFindings(text)).toEqual([]);
    },
  );
});

describe("passiveVoicePass — no detection for known -ado/-ido nouns", () => {
  it.each([
    "O problema foi resultado de vários fatores.",
    "Isso foi pedido dela.",
    "O documento foi estado da arte na época.",
  ])("'%s' yields no finding", (text) => {
    expect(passiveFindings(text)).toEqual([]);
  });
});

describe("passiveVoicePass — no detection for ambiguous forms in the lexicon", () => {
  it.each([
    "Ela é dedicada ao trabalho.",
    "Ele é interessado no assunto.",
    "Ela é casada.",
    "Ele é formado em Direito.",
  ])("'%s' yields no finding", (text) => {
    expect(passiveFindings(text)).toEqual([]);
  });
});

describe("passiveVoicePass — proparoxytone -ido/-ada adjectives are not participles (F1)", () => {
  it.each([
    "O prazo é válido.",
    "O carro é rápido.",
    "O material é sólido.",
    "O ar é úmido.",
    "Ele é tímido.",
    "O texto é lúcido.",
    "A regra é rígida.",
    "O líquido é ácido.",
  ])("'%s' yields no finding (an accent on the stem gives away an adjective, not a participle)", (text) => {
    expect(passiveFindings(text)).toEqual([]);
  });

  it("recall does not regress: a hiatus participle in -ído (accent ON the suffix) is still detected", () => {
    const findings = passiveFindings("O documento foi distribuído pela secretaria.");
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: true });
  });

  it.each([
    ["O prédio foi construído em dois anos.", "construído"],
    ["A tarefa foi concluída ontem.", "concluída"],
    ["O valor foi distribuído entre os sócios.", "distribuído"],
  ])("the hiatus participle in '%s' still anchors a passive", (text) => {
    expect(passiveFindings(text)).toHaveLength(1);
  });
});

describe("passiveVoicePass — eventiveness at four levels (A-1)", () => {
  it("an explicit agent → eventiveness 'agent' (high confidence), in any tense", () => {
    for (const text of ["O laudo foi assinado por João.", "O benefício é concedido pela plataforma."]) {
      const findings = passiveFindings(text);
      expect(findings, text).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: true, eventiveness: "agent" });
      expect(findings[0].severity, text).toBe("warning");
    }
  });

  it("a clearly eventive tense with no agent → 'eventive_tense' (a full passive)", () => {
    for (const text of [
      "O pedido foi aprovado.",
      "O processo será encaminhado ao setor.",
      "O projeto tinha sido aprovado.",
      "A proposta era analisada todo mês.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings, text).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: false, eventiveness: "eventive_tense" });
      expect(findings[0].severity, text).toBe("warning");
    }
  });

  it("present tense with no agent → reported only when the subject is postposed (A-13)", () => {
    for (const text of ["É vedada a cobrança.", "Art. 4º São criadas as funções."]) {
      const findings = passiveFindings(text);
      expect(findings, text).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: false, eventiveness: "postposed_subject" });
    }
    for (const text of ["O servidor é qualificado.", "A cobrança é vedada."]) {
      expect(passiveFindings(text), text).toHaveLength(0);
    }
  });

  it("names the verb-subject order as the reason, instead of hedging about three readings", () => {
    const [f] = passiveFindings("É vedada a cobrança.");
    expect(f.justification).toContain("o sujeito vem depois do particípio");
    expect(f.justification).not.toContain("Possível voz passiva");
    expect(f.justification).not.toContain("peso menor");
  });

  it("weighs the same as any other agentless passive, because it is one", () => {
    const [posposto] = passiveFindings("É vedada a cobrança.");
    const [confirmada] = passiveFindings("O pedido foi aprovado.");
    expect(posposto.severity).toBe("warning");
    expect(confirmada.severity).toBe("warning");
    expect(posposto.requiresHuman).toBe(true);
  });

  it("the deontic 'ser obrigado a' WITHOUT an agent is excluded from the passive (covered by leitor_terceira_pessoa)", () => {
    for (const text of [
      "Os candidatos são obrigados a comparecer.",
      "O contribuinte é obrigado a declarar os rendimentos.",
      "A empresa será obrigada a pagar a multa.",
    ]) {
      expect(passiveFindings(text), text).toEqual([]);
    }
  });

  it("'ser obrigado' WITH an explicit agent is a legitimate passive of 'obrigar' and is still flagged (A-6)", () => {
    for (const text of [
      "A empresa foi obrigada pelo tribunal a devolver o valor.",
      "Ele foi obrigado por João a assinar.",
      "O município foi obrigado pela Justiça a refazer a obra.",
    ]) {
      const findings = passiveFindings(text);
      expect(findings, text).toHaveLength(1);
      expect(findings[0].meta, text).toMatchObject({ hasAgent: true, eventiveness: "agent" });
      expect(findings[0].requiresHuman, text).toBe(false);
    }
  });

  it("integration: 'são obrigados a' yields ONLY leitor_terceira_pessoa, with no overlapping passive finding", () => {
    const d = analyze("Os candidatos são obrigados a comparecer.");
    expect(d.findings.map((f) => f.criterion)).toEqual(["leitor_terceira_pessoa"]);
  });
});

describe("passiveVoicePass — punctuation and conjunction barriers", () => {
  it("a comma between auxiliary and participle aborts the search (accepted false negative)", () => {
    expect(passiveFindings("Foi, sem dúvida, um erro grave.")).toEqual([]);
  });

  it("a conjunction between the auxiliary and a participle from another clause aborts the search", () => {
    expect(passiveFindings("Foi quando ele chegou atrasado.")).toEqual([]);
  });
});

describe("passiveVoicePass — window limit", () => {
  it("more than two connectors between auxiliary and participle exceeds the window and is not detected", () => {
    expect(passiveFindings("O documento foi já ainda sempre aprovado.")).toEqual([]);
  });

  it("exactly two connectors is still inside the window", () => {
    const findings = passiveFindings("O documento foi já ainda aprovado.");
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — config.passiveVoice.enabled", () => {
  it("switched off via config it yields no finding at all", () => {
    const config: Config = { ...DEFAULT_CONFIG, passiveVoice: { ...DEFAULT_CONFIG.passiveVoice, enabled: false } };
    expect(passiveFindings("O pedido foi aprovado pelo diretor.", config)).toEqual([]);
  });
});

describe("passiveVoicePass — byte-identical determinism", () => {
  it("the same input always produces the same JSON", () => {
    const text =
      "O pedido foi aprovado pelo diretor. A proposta foi rejeitada. " +
      "O documento tinha sido revisado pela equipe técnica, mas o outro foi recusado.";

    const r1 = JSON.stringify(passiveFindings(text));
    const r2 = JSON.stringify(passiveFindings(text));
    const r3 = JSON.stringify(passiveVoicePass.run(ctxFor(text)));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("passiveVoicePass — integration through the registry and through analyze()", () => {
  it("the pass is registered in PASSES", () => {
    expect(PASSES).toContain(passiveVoicePass);
    expect(PASSES).toContain(sentenceLengthPass);
  });

  it("analyze() includes passive-voice findings, correctly ordered", () => {
    const text = "O pedido foi aprovado pelo diretor. A comissão rejeitou a outra proposta.";
    const diagnostic = analyze(text);

    const passive = diagnostic.findings.filter((f) => f.criterion === "passive_voice");
    expect(passive).toHaveLength(1);
    expect(passive[0].normativeReference?.section).toBe("5.3.3");
    expect(passive[0].category).toBe("syntactic");
  });

  it("analyze().score.byCriterion includes an entry for passive_voice", () => {
    const diagnostic = analyze("O pedido foi aprovado pelo diretor.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "passive_voice");

    expect(entry).toBeDefined();
    expect(entry?.count.warning).toBe(1);
  });
});
