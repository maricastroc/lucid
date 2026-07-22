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

describe("passiveVoicePass — formas simples de ser", () => {
  it.each(["é", "são", "era", "eram", "foi", "foram", "será", "serão", "seria", "seriam", "seja", "sejam", "fosse", "fossem"])(
    "detecta passiva com a forma '%s' + particípio regular",
    (forma) => {
      const findings = passiveFindings(`Isso ${forma} aprovado pela equipe.`);
      expect(findings).toHaveLength(1);
    },
  );

  it("detecta com o infinitivo 'ser' seguido diretamente do particípio", () => {
    const findings = passiveFindings("O projeto vai ser analisado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("ser analisado");
  });

  it("detecta com 'sido' (particípio composto), sem precisar reconhecer o auxiliar anterior", () => {
    const findings = passiveFindings("O projeto tinha sido aprovado pelo conselho.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("sido aprovado pelo conselho.");
  });

  it("detecta com 'sendo' (gerúndio)", () => {
    const findings = passiveFindings("O prédio está sendo construído pela prefeitura.");
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — gênero e número do particípio regular", () => {
  it.each([
    ["O pedido foi aprovado.", "aprovado"],
    ["A proposta foi aprovada.", "aprovada"],
    ["Os pedidos foram aprovados.", "aprovados"],
    ["As propostas foram aprovadas.", "aprovadas"],
  ])("detecta a forma flexionada em '%s'", (text) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — particípios irregulares", () => {
  it.each([
    ["O texto foi escrito pelo autor.", true],
    ["A carta foi feita ontem.", false],
    ["Os documentos foram vistos pela equipe.", true],
    ["O caso foi posto em pauta.", false],
    ["A conta foi paga.", false],
    ["O réu foi preso pela polícia.", true],
    ["O prazo foi dado pelo juiz.", true],
  ])("detecta particípio irregular em '%s'", (text, hasAgent) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent });
  });
});

describe("passiveVoicePass — advérbio entre auxiliar e particípio", () => {
  it("aceita advérbio em -mente", () => {
    const findings = passiveFindings("Os pedidos foram rapidamente aprovados.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foram rapidamente aprovados");
  });

  it("aceita advérbio da lista fechada de conectores seguros", () => {
    const findings = passiveFindings("O pedido foi também aprovado.");
    expect(findings).toHaveLength(1);
  });

  it("aceita até dois conectores em sequência", () => {
    const findings = passiveFindings("O pedido foi ainda também aprovado.");
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — negação", () => {
  it("'não' antes do auxiliar não afeta a detecção", () => {
    const findings = passiveFindings("O relatório não foi entregue.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi entregue");
  });

  it("'não' entre auxiliar e particípio é um conector aceito", () => {
    const findings = passiveFindings("O pedido foi não aprovado, mas sim rejeitado.");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].span.text).toBe("foi não aprovado");
  });
});

describe("passiveVoicePass — agente com pelo/pela/pelos/pelas", () => {
  it.each([
    ["O pedido foi aprovado pelo diretor.", "pelo"],
    ["A proposta foi rejeitada pela comissão.", "pela"],
    ["Os relatórios foram entregues pelos servidores.", "pelos"],
    ["As contas foram analisadas pelas auditoras.", "pelas"],
  ])("reconhece agente introduzido por '%s' em '%s'", (text) => {
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: true });
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("'por' isolado (sem contração) NÃO conta como evidência de agente", () => {
    const findings = passiveFindings("O pedido foi aprovado por conveniência.");
    expect(findings).toHaveLength(1);
    expect(findings[0].meta).toMatchObject({ hasAgent: false });
    expect(findings[0].requiresHuman).toBe(true);
  });

  it("idiomas 'pelo menos'/'pelo visto'/'pelo contrário' não contam como agente", () => {
    for (const texto of [
      "O pedido foi aprovado pelo menos em parte.",
      "O pedido foi aprovado, pelo visto, sem ressalvas.",
      "O pedido não foi aprovado, pelo contrário.",
    ]) {
      const findings = passiveFindings(texto);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].meta).toMatchObject({ hasAgent: false });
    }
  });
});

describe("passiveVoicePass — agente omitido", () => {
  it("sem 'pelo/pela/pelos/pelas', requiresHuman é true e não há suggestion", () => {
    const findings = passiveFindings("O pedido foi aprovado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].requiresHuman).toBe(true);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].severity).toBe("warning");
  });
});

describe("passiveVoicePass — offsets exatos", () => {
  it("span reconstrói exatamente o trecho via slice do texto original", () => {
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

  it("span com agente inclui a frase agentiva até a próxima barreira", () => {
    const text = "Isso foi feito pelo comitê.";
    const doc = buildDocument(text);
    const findings = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("foi feito pelo comitê.");
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("passiveVoicePass — mais de uma passiva no documento", () => {
  it("detecta passivas em frases diferentes", () => {
    const text = "O pedido foi aprovado. A proposta foi rejeitada pela comissão.";
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.meta?.hasAgent)).toEqual([false, true]);
  });

  it("detecta duas passivas na mesma frase, separadas por conjunção", () => {
    const text = "O texto foi aprovado, mas o outro foi rejeitado.";
    const findings = passiveFindings(text);
    expect(findings).toHaveLength(2);
  });
});

describe("passiveVoicePass — nenhuma detecção em frases ativas", () => {
  it.each(["O diretor aprovou o pedido.", "A comissão rejeitou a proposta.", "Os servidores entregaram os relatórios."])(
    "'%s' não gera finding",
    (text) => {
      expect(passiveFindings(text)).toEqual([]);
    },
  );
});

describe("passiveVoicePass — nenhuma detecção com estar/ficar", () => {
  it.each(["A porta está fechada.", "O prédio ficou destruído.", "As contas estão pagas."])(
    "'%s' não gera finding (estar/ficar fora de escopo)",
    (text) => {
      expect(passiveFindings(text)).toEqual([]);
    },
  );
});

describe("passiveVoicePass — nenhuma detecção para substantivos -ado/-ido conhecidos", () => {
  it.each([
    "O problema foi resultado de vários fatores.",
    "Isso foi pedido dela.",
    "O documento foi estado da arte na época.",
  ])("'%s' não gera finding", (text) => {
    expect(passiveFindings(text)).toEqual([]);
  });
});

describe("passiveVoicePass — nenhuma detecção para formas ambíguas do léxico", () => {
  it.each(["Ela é dedicada ao trabalho.", "Ele é interessado no assunto.", "Ela é casada.", "Ele é formado em Direito."])(
    "'%s' não gera finding",
    (text) => {
      expect(passiveFindings(text)).toEqual([]);
    },
  );
});

describe("passiveVoicePass — barreiras de pontuação e conjunção", () => {
  it("vírgula entre auxiliar e particípio aborta a busca (falso negativo aceito)", () => {
    expect(passiveFindings("Foi, sem dúvida, um erro grave.")).toEqual([]);
  });

  it("conjunção entre auxiliar e um particípio de outra oração aborta a busca", () => {
    expect(passiveFindings("Foi quando ele chegou atrasado.")).toEqual([]);
  });
});

describe("passiveVoicePass — limite da janela", () => {
  it("mais de dois conectores entre auxiliar e particípio excede a janela e não detecta", () => {
    expect(passiveFindings("O documento foi já ainda sempre aprovado.")).toEqual([]);
  });

  it("exatamente dois conectores ainda está dentro da janela", () => {
    const findings = passiveFindings("O documento foi já ainda aprovado.");
    expect(findings).toHaveLength(1);
  });
});

describe("passiveVoicePass — config.passiveVoice.enabled", () => {
  it("desligado via config não gera nenhum finding", () => {
    const config: Config = { ...DEFAULT_CONFIG, passiveVoice: { ...DEFAULT_CONFIG.passiveVoice, enabled: false } };
    expect(passiveFindings("O pedido foi aprovado pelo diretor.", config)).toEqual([]);
  });
});

describe("passiveVoicePass — determinismo byte-idêntico", () => {
  it("mesma entrada produz sempre o mesmo JSON", () => {
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

describe("passiveVoicePass — integração pelo registry e por analyze()", () => {
  it("o pass está registrado em PASSES", () => {
    expect(PASSES).toContain(passiveVoicePass);
    expect(PASSES).toContain(sentenceLengthPass);
  });

  it("analyze() inclui findings de voz passiva, corretamente ordenados", () => {
    const text = "O pedido foi aprovado pelo diretor. A comissão rejeitou a outra proposta.";
    const diagnostic = analyze(text);

    const passive = diagnostic.findings.filter((f) => f.criterion === "passive_voice");
    expect(passive).toHaveLength(1);
    expect(passive[0].principle).toBe("5.3.3");
    expect(passive[0].category).toBe("syntactic");
  });

  it("analyze().score.byCriterion inclui uma entrada para passive_voice", () => {
    const diagnostic = analyze("O pedido foi aprovado pelo diretor.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "passive_voice");

    expect(entry).toBeDefined();
    expect(entry?.principle).toBe("5.3.3");
    expect(entry?.count.warning).toBe(1);
  });
});
