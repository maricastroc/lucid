import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../src/locales/pt-BR/passes/nominalization";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: createDataView([]) };
}

function nomFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return nominalizationPass.run(ctxFor(text, config));
}

describe("nominalizationPass — cada verbo leve cadastrado", () => {
  it.each([
    ["É preciso fazer a análise de documentos.", "analisar documentos"],
    ["É preciso realizar o pagamento da taxa.", "pagar a taxa"],
    ["É preciso efetuar a solicitação de acesso.", "solicitar acesso"],
    ["É preciso promover a avaliação de riscos.", "avaliar riscos"],
    ["É preciso proceder à verificação dos dados.", "verificar os dados"],
  ])("detecta e sugere corretamente em '%s'", (text, esperado) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe(esperado);
    expect(findings[0].requiresHuman).toBe(false);
  });
});

describe("nominalizationPass — formas infinitivas", () => {
  it("infinitivo gera sugestão quando o resto é seguro", () => {
    const findings = nomFindings("É obrigatório fazer a análise de documentos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("analisar documentos");
    expect(findings[0].requiresHuman).toBe(false);
  });
});

describe("nominalizationPass — formas finitas sem sugestão (complemento inseguro ou traço não cadastrado)", () => {
  it.each([
    "O comitê fez a análise ontem.",
    "A equipe efetuará a solicitação amanhã.",
    "Eles fazem a análise semanalmente.",
    "Eles faziam a análise semanalmente.",
    "É bom que façam a análise.",
  ])("'%s' é detectada, mas não recebe sugestão", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("nominalizationPass — formas finitas COM conjugação segura (ADR-011)", () => {
  it.each([
    ["O comitê fez a análise de documentos.", "analisou documentos"],
    ["A equipe realizou o pagamento da taxa.", "pagou a taxa"],
    ["Eles procederam à verificação dos dados.", "verificaram os dados"],
    ["Eles fazem a aprovação do projeto.", "aprovam o projeto"],
    ["A diretoria fará a avaliação dos riscos.", "avaliará os riscos"],
    ["O órgão realizava a publicação do edital.", "publicava o edital"], 
    ["O comitê fez a análise.", "analisou"], // sem complemento
  ])("'%s' → '%s' (traço preservado, sem conjugador produtivo)", (text, esperada) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe(esperada);
    expect(findings[0].requiresHuman).toBe(false);
  });
});

describe("nominalizationPass — artigos definidos e indefinidos", () => {
  it.each([
    ["fazer a análise", "a"],
    ["fazer o pagamento", "o"],
    ["fazer as análises", "as"],
    ["fazer os pagamentos", "os"],
    ["fazer uma análise", "uma"],
  ])("aceita determinante '%s'", (fragmento) => {
    const findings = nomFindings(`É preciso ${fragmento}.`);
    expect(findings).toHaveLength(1);
  });

  it("'um pagamento' também é aceito", () => {
    const findings = nomFindings("É preciso fazer um pagamento.");
    expect(findings).toHaveLength(1);
  });
});

describe("nominalizationPass — contrações à/ao/às/aos", () => {
  it.each([
    "É preciso proceder à verificação dos dados.",
    "É preciso proceder ao pagamento imediatamente.",
  ])("'%s' casa com o padrão 'a' de 'proceder'", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
  });

  it("determinante 'direct' (o/a/os/as/um/uma) não casa com verbo de padrão 'a'", () => {
    expect(nomFindings("É preciso proceder a verificação.")).toEqual([]);
  });
});

describe("nominalizationPass — nominalizações cadastradas", () => {
  it.each(["análise", "pagamento", "solicitação", "verificação", "avaliação", "aprovação", "correção", "atualização", "publicação", "cancelamento", "agendamento"])(
    "'%s' é reconhecida",
    (nominalizacao) => {
      const findings = nomFindings(`É preciso fazer a ${nominalizacao}.`);
      expect(findings).toHaveLength(1);
    },
  );

  it("'revisão' é detectada mas NUNCA recebe sugestão (mapeamento não-único)", () => {
    const findings = nomFindings("É preciso promover a revisão dos autos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
    expect(findings[0].meta).toMatchObject({ nominalization: "revisão" });
  });
});

describe("nominalizationPass — palavras não cadastradas", () => {
  it.each(["formação", "administração", "operação", "edição", "condução", "bolo", "presente", "tempo"])(
    "'%s' não é reconhecida (fora do dataset)",
    (palavra) => {
      expect(nomFindings(`É preciso fazer a ${palavra}.`)).toEqual([]);
    },
  );
});

describe("nominalizationPass — verbo leve usado lexicalmente", () => {
  it.each(["Fazer o bolo é fácil.", "Dar um presente é gentil.", "É preciso ter tempo."])(
    "'%s' não gera finding (objeto não é nominalização cadastrada)",
    (text) => {
      expect(nomFindings(text)).toEqual([]);
    },
  );

  it("nominalização sem determinante não casa (nenhuma exceção documentada nesta etapa)", () => {
    expect(nomFindings("É preciso fazer análise de documentos.")).toEqual([]);
  });
});

describe("nominalizationPass — nominalização sem verbo leve", () => {
  it.each(["A análise foi publicada ontem.", "O pagamento venceu ontem."])(
    "'%s' não gera finding",
    (text) => {
      expect(nomFindings(text)).toEqual([]);
    },
  );
});

describe("nominalizationPass — pontuação e conjunção como barreiras (para a sugestão)", () => {
  it("coordenação de nominalizações é detectada, mas não recebe sugestão", () => {
    const findings = nomFindings("É preciso fazer a análise e a revisão dos dados.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fazer a análise");
    expect(findings[0].suggestion).toBeUndefined();
  });

  it("oração encaixada é detectada, mas não recebe sugestão", () => {
    const findings = nomFindings("É preciso realizar a análise que foi solicitada.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("realizar a análise");
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("nominalizationPass — modificador entre determinante e nominalização", () => {
  it("adjetivo entre determinante e nominalização impede o casamento do núcleo", () => {
    // "a boa análise": "boa" ocupa a posição que teria que ser a nominalização.
    expect(nomFindings("É preciso fazer a boa análise.")).toEqual([]);
  });

  it("possessivo entre determinante e nominalização impede o casamento do núcleo", () => {
    expect(nomFindings("É preciso fazer a nossa análise.")).toEqual([]);
  });

  it("modificador DEPOIS da nominalização não impede detecção, mas impede sugestão", () => {
    const findings = nomFindings("É preciso realizar uma análise cuidadosa dos documentos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("realizar uma análise");
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("nominalizationPass — complemento sem preposição", () => {
  it("nominalização no fim da frase (sem complemento) é segura para sugestão", () => {
    const findings = nomFindings("É preciso fazer a análise.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("analisar");
    expect(findings[0].span.text).toBe("fazer a análise");
  });
});

describe("nominalizationPass — complemento com 'de'", () => {
  it("'de' + 1 palavra + fim de frase é seguro", () => {
    const findings = nomFindings("É preciso fazer a análise de documentos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe("analisar documentos");
    expect(findings[0].span.text).toBe("fazer a análise de documentos");
  });

  it("complemento com mais de 1 palavra não é seguro", () => {
    const findings = nomFindings("É preciso fazer a análise de documentos e contratos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].span.text).toBe("fazer a análise");
  });
});

describe("nominalizationPass — contrações do/da/dos/das no complemento", () => {
  it.each([
    ["É preciso fazer a análise do processo.", "analisar o processo"],
    ["É preciso realizar o pagamento da taxa.", "pagar a taxa"],
    ["É preciso proceder à verificação dos dados.", "verificar os dados"],
    ["É preciso fazer a análise das propostas.", "analisar as propostas"],
  ])("'%s' expande a contração corretamente", (text, esperado) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe(esperado);
  });
});

describe("nominalizationPass — regência preservada", () => {
  it("a preposição de origem não aparece na sugestão (é absorvida pelo verbo transitivo)", () => {
    const findings = nomFindings("É preciso fazer a análise de documentos.");
    expect(findings[0].suggestion).not.toMatch(/\bde\b/);
  });

  it("o artigo da contração aparece corretamente na sugestão, sem duplicar", () => {
    const findings = nomFindings("É preciso realizar o pagamento da taxa.");
    expect(findings[0].suggestion).toBe("pagar a taxa");
    expect(findings[0].suggestion).not.toContain("da");
  });
});

describe("nominalizationPass — sugestão segura no infinitivo", () => {
  it("todas as condições satisfeitas produzem requiresHuman: false", () => {
    const findings = nomFindings("É preciso fazer a análise de documentos.");
    expect(findings[0].requiresHuman).toBe(false);
    expect(findings[0].suggestion).toBeTruthy();
  });
});

describe("nominalizationPass — traços fora da tabela fechada continuam sem sugestão (ADR-011)", () => {
  it.each([
    "O comitê faria a análise dos dados.", // futuro do pretérito (condicional)
    "É bom que façam a análise de riscos.", // presente do subjuntivo
    "Fazendo a análise dos autos, o comitê seguiu.", // gerúndio
  ])("'%s' é detectada, mas não recebe sugestão (condicional/subjuntivo/gerúndio não cobertos)", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("nominalizationPass — ausência de sugestão diante de ambiguidade", () => {
  it("mapeamento não-único ('revisão') nunca recebe sugestão, mesmo infinitivo e complemento limpo", () => {
    const findings = nomFindings("É preciso fazer a revisão de documentos.");
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("nominalizationPass — ausência de perda de modificadores", () => {
  it("nenhuma sugestão insegura é emitida quando material adicional existiria fora do span", () => {
    for (const text of [
      "É preciso fazer a análise e a revisão dos dados.",
      "É preciso realizar a análise que foi solicitada.",
      "É preciso fazer a análise de documentos e contratos.",
      "É preciso realizar uma análise cuidadosa dos documentos.",
    ]) {
      const findings = nomFindings(text);
      expect(findings).toHaveLength(1);
      expect(findings[0].suggestion).toBeUndefined();
    }
  });
});

describe("nominalizationPass — offsets exatos", () => {
  it("span reconstrói exatamente o trecho via slice do texto original", () => {
    const text = "É preciso fazer a análise de documentos.";
    const doc = buildDocument(text);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
    expect(findings[0].span.text).toBe("fazer a análise de documentos");
    expect(findings[0].suggestion).toBe("analisar documentos");
  });

  it("span sem sugestão cobre só o núcleo de 3 tokens", () => {
    const text = "O comitê fez a análise ontem.";
    const doc = buildDocument(text);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe("fez a análise");
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("nominalizationPass — múltiplos findings", () => {
  it("detecta construções em frases diferentes", () => {
    const text = "É preciso fazer a análise de documentos. Depois, realizar o pagamento da taxa.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings[0].suggestion).toBe("analisar documentos");
    expect(findings[1].suggestion).toBe("pagar a taxa");
  });

  it("detecta duas construções na mesma frase", () => {
    const text = "Convém fazer a análise, mas também realizar a verificação.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
  });
});

describe("nominalizationPass — config.nominalization", () => {
  it("enabled:false desliga o pass inteiro", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { ...DEFAULT_CONFIG.nominalization, enabled: false } };
    expect(nomFindings("É preciso fazer a análise de documentos.", config)).toEqual([]);
  });

  it("suggest:false remove toda sugestão, mesmo quando seria segura", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { ...DEFAULT_CONFIG.nominalization, suggest: false } };
    const findings = nomFindings("É preciso fazer a análise de documentos.", config);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
    expect(findings[0].requiresHuman).toBe(true);
  });
});

describe("nominalizationPass — determinismo byte-idêntico", () => {
  it("mesma entrada produz sempre o mesmo JSON", () => {
    const text =
      "É preciso fazer a análise de documentos. O comitê fez a análise ontem. " +
      "Convém promover a revisão dos autos, mas também realizar o pagamento da taxa.";

    const r1 = JSON.stringify(nomFindings(text));
    const r2 = JSON.stringify(nomFindings(text));
    const r3 = JSON.stringify(nominalizationPass.run(ctxFor(text)));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("nominalizationPass — integração pelo registry e por analyze()", () => {
  it("o pass está registrado em PASSES", () => {
    expect(PASSES).toContain(nominalizationPass);
    expect(PASSES).toContain(sentenceLengthPass);
    expect(PASSES).toContain(passiveVoicePass);
  });

  it("analyze() inclui findings de nominalização, corretamente ordenados", () => {
    const text = "É preciso fazer a análise de documentos. O comitê fez a análise ontem.";
    const diagnostic = analyze(text);

    const nominalizations = diagnostic.findings.filter((f) => f.criterion === "nominalization");
    expect(nominalizations).toHaveLength(2);
    expect(nominalizations[0].principle).toBe("5.3.3");
    expect(nominalizations[0].category).toBe("syntactic");
  });

  it("analyze().score.byCriterion inclui uma entrada para nominalization", () => {
    const diagnostic = analyze("É preciso fazer a análise de documentos.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "nominalization");

    expect(entry).toBeDefined();
    expect(entry?.principle).toBe("5.3.3");
    expect(entry?.count.warning).toBe(1);
  });
});
