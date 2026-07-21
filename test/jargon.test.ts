import { describe, expect, it } from "vitest";
import { jargonPass } from "../src/lucid/core/passes/jargon";
import { sentenceLengthPass } from "../src/lucid/core/passes/sentence-length";
import { passiveVoicePass } from "../src/lucid/core/passes/passive-voice";
import { nominalizationPass } from "../src/lucid/core/passes/nominalization";
import { PASSES } from "../src/lucid/core/passes/registry";
import { analyze } from "../src/lucid/core/analyzer";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "../src/lucid/core/document/model";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: {} };
}

function jargonFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return jargonPass.run(ctxFor(text, config));
}

describe("jargonPass — unigrama cadastrado", () => {
  it("detecta 'doravante' com sugestão segura", () => {
    const findings = jargonFindings("Doravante, os prazos serão contados em dias úteis.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("a partir de agora");
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("detecta 'outrossim' com sugestão segura", () => {
    const findings = jargonFindings("O prazo será prorrogado. Outrossim, os autos serão arquivados.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("além disso");
  });
});

describe("jargonPass — expressão multipalavra", () => {
  it("detecta 'em sede de' com sugestão segura", () => {
    const findings = jargonFindings("O pedido foi negado em sede de recurso.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("em sede de");
    expect(findings[0].suggestion).toBe("no âmbito de");
  });

  it("detecta 'fazer jus a' conjugado (não só o infinitivo)", () => {
    const findings = jargonFindings("O servidor faz jus a auxílio-alimentação.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("faz jus a");
    expect(findings[0].suggestion).toBe("tem direito a");
  });
});

describe("jargonPass — lote 2 (ADR-010): novas entradas seguras", () => {
  it.each([
    ["Destarte, o pedido foi indeferido.", "Destarte", "assim"],
    ["Conquanto tardio, o recurso foi conhecido.", "Conquanto", "embora"],
    ["Aplica-se a regra, mormente em casos urgentes.", "mormente", "principalmente"],
    ["Tão logo seja publicado, produz efeitos.", "Tão logo", "assim que"],
    ["Via de regra, o prazo é de dez dias.", "Via de regra", "em geral"],
    ["A decisão tem fundamento com fulcro na jurisprudência.", "com fulcro na", "com base na"],
    ["Indeferiu-se o pedido com fulcro no artigo quinto.", "com fulcro no", "com base no"],
  ])("detecta e sugere em '%s'", (texto, esperadoSpan, esperadaSugestao) => {
    const findings = jargonFindings(texto);
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(esperadoSpan);
    expect(findings[0].suggestion).toBe(esperadaSugestao);
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("'por quanto' (dois tokens) NÃO casa com o unigrama 'porquanto'", () => {
    expect(jargonFindings("Por quanto tempo o prazo permanece válido?")).toEqual([]);
  });

  it("'via de acesso' NÃO casa com 'via de regra' (difere no 3º token)", () => {
    expect(jargonFindings("A via de acesso estava interditada.")).toEqual([]);
  });
});

describe("jargonPass — longest-match-first", () => {
  it("'em sede de' vence sobre qualquer entrada isolada de 'sede' (que nem está cadastrada)", () => {
    const findings = jargonFindings("Em sede de recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text.toLowerCase()).toBe("em sede de");
  });

  it("'fazer jus a' (3 tokens) é preferido sobre um match parcial hipotético mais curto", () => {
    const findings = jargonFindings("Ele fará jus a benefício assim que completar o tempo mínimo.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fará jus a");
  });
});

describe("jargonPass — ausência de findings sobrepostos", () => {
  it("dois termos adjacentes não geram findings com spans sobrepostos", () => {
    const findings = jargonFindings("O documento supracitado, doravante, será juntado aos autos.");
    expect(findings).toHaveLength(2);
    const [a, b] = findings;
    expect(a.span.end).toBeLessThanOrEqual(b.span.start);
  });
});

describe("jargonPass — correspondência case-insensitive", () => {
  it("expressão multipalavra em caixa alta é reconhecida", () => {
    const findings = jargonFindings("EM SEDE DE recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("no âmbito de");
  });

  it("expressão multipalavra em caixa mista é reconhecida", () => {
    const findings = jargonFindings("O benefício, Fazem Jus A ele os aposentados, foi suspenso.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("têm direito a");
  });
});

describe("jargonPass — preservação de offsets", () => {
  it("span reconstrói exatamente o trecho via slice do texto original", () => {
    const text = "O pedido foi negado em sede de recurso.";
    const doc = buildDocument(text);
    const findings = jargonPass.run({ doc, config: DEFAULT_CONFIG, data: {} });

    expect(findings).toHaveLength(1);
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("jargonPass — mais de um termo no documento", () => {
  it("detecta termos em frases diferentes", () => {
    const text = "O documento supracitado foi arquivado. Doravante, os prazos mudam.";
    const findings = jargonFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings[0].span.text).toBe("supracitado");
    expect(findings[1].span.text).toBe("Doravante");
  });
});

describe("jargonPass — termo fora do glossário", () => {
  it("palavra comum não gera finding", () => {
    expect(jargonFindings("O gato subiu no telhado rapidamente.")).toEqual([]);
  });
});

describe("jargonPass — palavra rara fora do glossário", () => {
  it("palavra pouco frequente, mas não cadastrada, não gera finding (sem heurística de raridade)", () => {
    expect(jargonFindings("O paquiderme observava o ornitorrinco com curiosidade.")).toEqual([]);
  });
});

describe("jargonPass — termo polissêmico não cadastrado isoladamente", () => {
  it("'consoante' não é reconhecida (omitida do dataset por polissemia)", () => {
    expect(jargonFindings("A palavra começa com uma consoante.")).toEqual([]);
    expect(jargonFindings("Consoante o disposto no edital, o prazo é de 10 dias.")).toEqual([]);
  });
});

describe("jargonPass — expressão que desambigua termo polissêmico", () => {
  it("'sede' isolada (residência/vontade de beber) não é reconhecida", () => {
    expect(jargonFindings("A empresa tem sede em São Paulo.")).toEqual([]);
  });

  it("'em sede de' (expressão) é reconhecida mesmo contendo a palavra polissêmica 'sede'", () => {
    const findings = jargonFindings("Em sede de recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
  });
});

describe("jargonPass — sugestão segura", () => {
  it("todas as condições satisfeitas produzem requiresHuman: false e suggestion preenchida", () => {
    const findings = jargonFindings("O documento supracitado foi arquivado.");
    expect(findings[0].requiresHuman).toBe(false);
    expect(findings[0].suggestion).toBe("citado acima");
  });
});

describe("jargonPass — entrada sem sugestão", () => {
  it("'na hipótese de' é detectada, mas nunca recebe sugestão (regência dependente de contexto)", () => {
    const findings = jargonFindings("Na hipótese de atraso, aplica-se a multa.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });

  it("'de acordo com o disposto' é detectada, mas nunca recebe sugestão", () => {
    const findings = jargonFindings("De acordo com o disposto no edital, o prazo é de 10 dias.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("jargonPass — requiresHuman", () => {
  it("é false quando a sugestão é emitida", () => {
    expect(jargonFindings("Outrossim, o prazo será prorrogado.")[0].requiresHuman).toBe(false);
  });

  it("é true quando a entrada não permite sugestão", () => {
    expect(jargonFindings("Na hipótese de atraso, aplica-se a multa.")[0].requiresHuman).toBe(true);
  });
});

describe("jargonPass — config.jargon.enabled", () => {
  it("enabled:false desliga o pass inteiro", () => {
    const config: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, enabled: false } };
    expect(jargonFindings("O documento supracitado foi arquivado.", config)).toEqual([]);
  });
});

describe("jargonPass — config.jargon.suggestFromGlossary", () => {
  it("suggestFromGlossary:false remove toda sugestão, mesmo quando seria segura", () => {
    const config: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, suggestFromGlossary: false } };
    const findings = jargonFindings("O documento supracitado foi arquivado.", config);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("jargonPass — provável nome próprio com maiúscula", () => {
  it("unigrama capitalizado em meio de frase é suprimido (heurística conservadora)", () => {
    expect(jargonFindings("Ele disse que, Outrossim, viria depois.")).toEqual([]);
  });
});

describe("jargonPass — termo no início da frase", () => {
  it("unigrama capitalizado por ser a primeira palavra da frase NÃO é suprimido", () => {
    const findings = jargonFindings("Doravante, os prazos serão contados em dias úteis.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("Doravante");
  });
});

describe("jargonPass — aspas", () => {
  it("termo entre aspas retas duplas é suprimido (finding inteiro, não só a sugestão)", () => {
    expect(jargonFindings('O termo "supracitado" é usado no documento.')).toEqual([]);
  });

  it("termo entre aspas curvas é suprimido", () => {
    expect(jargonFindings("O termo “supracitado” é usado no documento.")).toEqual([]);
  });

  it("aspa sem fechamento correspondente na frase NÃO suprime (limitação documentada)", () => {
    const findings = jargonFindings('O termo "supracitado é usado no documento.');
    expect(findings).toHaveLength(1);
  });
});

describe("jargonPass — pontuação entre tokens de expressão", () => {
  it("vírgula quebrando 'em sede, de recurso' não casa com 'em sede de'", () => {
    expect(jargonFindings("Isso ocorreu em sede, de recurso interposto.")).toEqual([]);
  });
});

describe("jargonPass — expressão incompleta", () => {
  it("'em sede' sem 'de' não casa", () => {
    expect(jargonFindings("Isso ocorreu em sede do processo.")).toEqual([]);
  });

  it("'na hipótese' sem 'de' não casa", () => {
    expect(jargonFindings("Na hipótese levantada, nada mudou.")).toEqual([]);
  });
});

describe("jargonPass — fim de frase", () => {
  it("unigrama logo antes do ponto final é reconhecido", () => {
    const findings = jargonFindings("O texto citado é o supracitado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("supracitado");
  });

  it("expressão multipalavra logo antes do ponto final é reconhecida", () => {
    const findings = jargonFindings("O benefício era concedido a quem fazia jus a.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fazia jus a");
  });
});

describe("jargonPass — determinismo byte-idêntico", () => {
  it("mesma entrada produz sempre o mesmo JSON", () => {
    const text =
      "O documento supracitado foi arquivado. Doravante, os prazos mudam. " +
      "O servidor faz jus a auxílio, na hipótese de comprovação.";

    const r1 = JSON.stringify(jargonFindings(text));
    const r2 = JSON.stringify(jargonFindings(text));
    const r3 = JSON.stringify(jargonPass.run(ctxFor(text)));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("jargonPass — integração pelo registry e por analyze()", () => {
  it("o pass está registrado em PASSES", () => {
    expect(PASSES).toContain(jargonPass);
    expect(PASSES).toContain(sentenceLengthPass);
    expect(PASSES).toContain(passiveVoicePass);
    expect(PASSES).toContain(nominalizationPass);
  });

  it("analyze() inclui findings de jargão, corretamente ordenados", () => {
    const text = "O documento supracitado foi arquivado. Doravante, os prazos mudam.";
    const diagnostic = analyze(text);

    const jargonFindingsFromAnalyze = diagnostic.findings.filter((f) => f.criterion === "jargon");
    expect(jargonFindingsFromAnalyze).toHaveLength(2);
    expect(jargonFindingsFromAnalyze[0].principle).toBe("5.3.2");
    expect(jargonFindingsFromAnalyze[0].category).toBe("lexical");
  });

  it("analyze().score.byCriterion inclui uma entrada para jargon", () => {
    const diagnostic = analyze("O documento supracitado foi arquivado.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "jargon");

    expect(entry).toBeDefined();
    expect(entry?.principle).toBe("5.3.2");
    expect(entry?.count.warning).toBe(1);
  });
});
