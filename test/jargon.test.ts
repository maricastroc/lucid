import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { jargonPass } from "../src/locales/pt-BR/passes/jargon";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { nominalizationPass } from "../src/locales/pt-BR/passes/nominalization";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: createDataView([]) };
}

function jargonFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return jargonPass.run(ctxFor(text, config));
}

describe("jargonPass — curated unigram", () => {
  it("detects 'doravante' with a safe suggestion", () => {
    const findings = jargonFindings("Doravante, os prazos serão contados em dias úteis.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("a partir de agora");
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("detects 'outrossim' with a safe suggestion", () => {
    const findings = jargonFindings("O prazo será prorrogado. Outrossim, os autos serão arquivados.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("além disso");
  });
});

describe("jargonPass — multi-word expression", () => {
  it("detects 'em sede de' with a safe suggestion", () => {
    const findings = jargonFindings("O pedido foi negado em sede de recurso.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("em sede de");
    expect(findings[0].suggestion).toBe("no âmbito de");
  });

  it("detects a conjugated 'fazer jus a' (not just the infinitive)", () => {
    const findings = jargonFindings("O servidor faz jus a auxílio-alimentação.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("faz jus a");
    expect(findings[0].suggestion).toBe("tem direito a");
  });
});

describe("jargonPass — batch 2 (ADR-010): new safe entries", () => {
  it.each([
    ["Destarte, o pedido foi indeferido.", "Destarte", "assim"],
    ["Conquanto tardio, o recurso foi conhecido.", "Conquanto", "embora"],
    ["Aplica-se a regra, mormente em casos urgentes.", "mormente", "principalmente"],
    ["Tão logo seja publicado, produz efeitos.", "Tão logo", "assim que"],
    ["Via de regra, o prazo é de dez dias.", "Via de regra", "em geral"],
    ["A decisão tem fundamento com fulcro na jurisprudência.", "com fulcro na", "com base na"],
    ["Indeferiu-se o pedido com fulcro no artigo quinto.", "com fulcro no", "com base no"],
  ])("detects and suggests in '%s'", (text, expectedSpan, expectedSuggestion) => {
    const findings = jargonFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(expectedSpan);
    expect(findings[0].suggestion).toBe(expectedSuggestion);
    expect(findings[0].requiresHuman).toBe(false);
  });

  it("'por quanto' (two tokens) does NOT match the unigram 'porquanto'", () => {
    expect(jargonFindings("Por quanto tempo o prazo permanece válido?")).toEqual([]);
  });

  it("'via de acesso' does NOT match 'via de regra' (they differ at the 3rd token)", () => {
    expect(jargonFindings("A via de acesso estava interditada.")).toEqual([]);
  });
});

describe("jargonPass — longest-match-first", () => {
  it("'em sede de' wins over any standalone entry for 'sede' (which is not even curated)", () => {
    const findings = jargonFindings("Em sede de recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text.toLowerCase()).toBe("em sede de");
  });

  it("'fazer jus a' (3 tokens) is preferred over a hypothetical shorter partial match", () => {
    const findings = jargonFindings("Ele fará jus a benefício assim que completar o tempo mínimo.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fará jus a");
  });
});

describe("jargonPass — no overlapping findings", () => {
  it("two adjacent terms do not produce findings with overlapping spans", () => {
    const findings = jargonFindings("O documento supracitado, doravante, será juntado aos autos.");
    expect(findings).toHaveLength(2);
    const [a, b] = findings;
    expect(a.span.end).toBeLessThanOrEqual(b.span.start);
  });
});

describe("jargonPass — case-insensitive matching", () => {
  it("a multi-word expression in all caps is recognized", () => {
    const findings = jargonFindings("EM SEDE DE recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("no âmbito de");
  });

  it("a multi-word expression in mixed case is recognized", () => {
    const findings = jargonFindings("O benefício, Fazem Jus A ele os aposentados, foi suspenso.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("têm direito a");
  });
});

describe("jargonPass — offset preservation", () => {
  it("the span reconstructs the excerpt exactly by slicing the original text", () => {
    const text = "O pedido foi negado em sede de recurso.";
    const doc = buildDocument(text);
    const findings = jargonPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("jargonPass — more than one term in the document", () => {
  it("detects terms in different sentences", () => {
    const text = "O documento supracitado foi arquivado. Doravante, os prazos mudam.";
    const findings = jargonFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings[0].span.text).toBe("supracitado");
    expect(findings[1].span.text).toBe("Doravante");
  });
});

describe("jargonPass — a term outside the glossary", () => {
  it("an ordinary word yields no finding", () => {
    expect(jargonFindings("O gato subiu no telhado rapidamente.")).toEqual([]);
  });
});

describe("jargonPass — a rare word outside the glossary", () => {
  it("an infrequent but uncurated word yields no finding (no rarity heuristic)", () => {
    expect(jargonFindings("O paquiderme observava o ornitorrinco com curiosidade.")).toEqual([]);
  });
});

describe("jargonPass — a polysemous term deliberately left uncurated", () => {
  it("'consoante' is not recognized (omitted from the dataset for polysemy)", () => {
    expect(jargonFindings("A palavra começa com uma consoante.")).toEqual([]);
    expect(jargonFindings("Consoante o disposto no edital, o prazo é de 10 dias.")).toEqual([]);
  });
});

describe("jargonPass — an expression that disambiguates a polysemous term", () => {
  it("standalone 'sede' (headquarters/thirst) is not recognized", () => {
    expect(jargonFindings("A empresa tem sede em São Paulo.")).toEqual([]);
  });

  it("'em sede de' (the expression) is recognized even though it contains the polysemous 'sede'", () => {
    const findings = jargonFindings("Em sede de recurso, o pedido foi negado.");
    expect(findings).toHaveLength(1);
  });
});

describe("jargonPass — safe suggestion", () => {
  it("with every condition satisfied it yields requiresHuman: false and a filled suggestion", () => {
    const findings = jargonFindings("O documento supracitado foi arquivado.");
    expect(findings[0].requiresHuman).toBe(false);
    expect(findings[0].suggestion).toBe("citado acima");
  });
});

describe("jargonPass — an entry with no suggestion", () => {
  it("'na hipótese de' is detected but never gets a suggestion (context-dependent government)", () => {
    const findings = jargonFindings("Na hipótese de atraso, aplica-se a multa.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });

  it("'de acordo com o disposto' is detected but never gets a suggestion", () => {
    const findings = jargonFindings("De acordo com o disposto no edital, o prazo é de 10 dias.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("jargonPass — requiresHuman", () => {
  it("is false when a suggestion is emitted", () => {
    expect(jargonFindings("Outrossim, o prazo será prorrogado.")[0].requiresHuman).toBe(false);
  });

  it("is true when the entry allows no suggestion", () => {
    expect(jargonFindings("Na hipótese de atraso, aplica-se a multa.")[0].requiresHuman).toBe(true);
  });
});

describe("jargonPass — config.jargon.enabled", () => {
  it("enabled:false switches off the whole pass", () => {
    const config: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, enabled: false } };
    expect(jargonFindings("O documento supracitado foi arquivado.", config)).toEqual([]);
  });
});

describe("jargonPass — config.jargon.suggestFromGlossary", () => {
  it("suggestFromGlossary:false removes every suggestion, even where it would be safe", () => {
    const config: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, suggestFromGlossary: false } };
    const findings = jargonFindings("O documento supracitado foi arquivado.", config);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("jargonPass — capitalization does not suppress a curated term (A-12b)", () => {
  it("a capitalized unigram mid-sentence IS flagged: the curated glossary is the authority", () => {
    const findings = jargonFindings("Ele disse que, Outrossim, viria depois.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("Outrossim");
  });

  it("the same term is treated identically at the start and in the middle of the sentence (asymmetry gone)", () => {
    const atStart = jargonFindings("Outrossim, arquivo os autos.");
    const inMiddle = jargonFindings("Indefiro o pedido; Outrossim, arquivo os autos.");
    expect(atStart).toHaveLength(1);
    expect(inMiddle).toHaveLength(1);
    expect(inMiddle[0].suggestion).toBe(atStart[0].suggestion);
  });

  it("quotes still suppress — mentioning the term is not using it", () => {
    expect(jargonFindings('O termo "supracitado" aparece no texto.')).toEqual([]);
  });
});

describe("jargonPass — a term at the start of the sentence", () => {
  it("a unigram capitalized only because it is the first word is NOT suppressed", () => {
    const findings = jargonFindings("Doravante, os prazos serão contados em dias úteis.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("Doravante");
  });
});

describe("jargonPass — quotes", () => {
  it("a term inside straight double quotes is suppressed (the whole finding, not just the suggestion)", () => {
    expect(jargonFindings('O termo "supracitado" é usado no documento.')).toEqual([]);
  });

  it("a term inside curly quotes is suppressed", () => {
    expect(jargonFindings("O termo “supracitado” é usado no documento.")).toEqual([]);
  });

  it("a quote with no matching closer in the sentence does NOT suppress (documented limitation)", () => {
    const findings = jargonFindings('O termo "supracitado é usado no documento.');
    expect(findings).toHaveLength(1);
  });
});

describe("jargonPass — punctuation between the tokens of an expression", () => {
  it("a comma breaking 'em sede, de recurso' does not match 'em sede de'", () => {
    expect(jargonFindings("Isso ocorreu em sede, de recurso interposto.")).toEqual([]);
  });
});

describe("jargonPass — an incomplete expression", () => {
  it("'em sede' without 'de' does not match", () => {
    expect(jargonFindings("Isso ocorreu em sede do processo.")).toEqual([]);
  });

  it("'na hipótese' without 'de' does not match", () => {
    expect(jargonFindings("Na hipótese levantada, nada mudou.")).toEqual([]);
  });
});

describe("jargonPass — end of sentence", () => {
  it("a unigram right before the full stop is recognized", () => {
    const findings = jargonFindings("O texto citado é o supracitado.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("supracitado");
  });

  it("a multi-word expression right before the full stop is recognized", () => {
    const findings = jargonFindings("O benefício era concedido a quem fazia jus a.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fazia jus a");
  });
});

describe("jargonPass — byte-identical determinism", () => {
  it("the same input always produces the same JSON", () => {
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

describe("jargonPass — integration through the registry and through analyze()", () => {
  it("the pass is registered in PASSES", () => {
    expect(PASSES).toContain(jargonPass);
    expect(PASSES).toContain(sentenceLengthPass);
    expect(PASSES).toContain(passiveVoicePass);
    expect(PASSES).toContain(nominalizationPass);
  });

  it("analyze() includes jargon findings, correctly ordered", () => {
    const text = "O documento supracitado foi arquivado. Doravante, os prazos mudam.";
    const diagnostic = analyze(text);

    const jargonFindingsFromAnalyze = diagnostic.findings.filter((f) => f.criterion === "jargon");
    expect(jargonFindingsFromAnalyze).toHaveLength(2);
    expect(jargonFindingsFromAnalyze[0].normativeReference?.section).toBe("5.3.2");
    expect(jargonFindingsFromAnalyze[0].category).toBe("lexical");
  });

  it("analyze().score.byCriterion includes an entry for jargon", () => {
    const diagnostic = analyze("O documento supracitado foi arquivado.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "jargon");

    expect(entry).toBeDefined();
    expect(entry?.count.warning).toBe(1);
  });
});
