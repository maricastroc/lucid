import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, sortFindings } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import { runMetrics } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { Finding } from "../src/lucid/core/types";

describe("analyze — documento vazio", () => {
  it("texto vazio produz Diagnostic sem findings, placar zerado e métricas zeradas", () => {
    const diagnostic = analyze("");

    expect(diagnostic.text).toBe("");
    expect(diagnostic.findings).toEqual([]);
    expect(diagnostic.score).toEqual({
      byCriterion: [
        { criterion: "long_sentence", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "passive_voice", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "nominalization", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "nominalizacao_encadeada", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "jargon", principle: "5.3.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "mais_que_perfeito_sintetico", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "gerundismo", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "adverbio_mente_denso", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "redundancia", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "perifrase_inflada", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "paragraph_length", principle: "5.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "prose_enumeration", principle: "5.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "mesoclise", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "dupla_negacao", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "subordinacao_densa", principle: "5.3.4", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "leitor_terceira_pessoa", principle: "5.3.3", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "salto_de_nivel_titulo", principle: "5.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "long_heading", principle: "5.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "single_item_list", principle: "5.2", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
        { criterion: "heading_body_mismatch", principle: "5.1", count: { info: 0, warning: 0, error: 0 }, densityPer100Words: 0 },
      ],
      totalFindings: 0,
    });
    expect(diagnostic.metrics).toEqual({
      fleschPt: 0,
      words: 0,
      sentences: 0,
      syllables: 0,
      wordsPerSentence: 0,
      syllablesPerWord: 0,
    });
  });
});

describe("analyze — documento sem findings", () => {
  it("texto com frases curtas não gera findings, mas métricas e placar refletem o texto", () => {
    const diagnostic = analyze("O gato subiu. O cão correu.");

    expect(diagnostic.findings).toEqual([]);
    expect(diagnostic.score.totalFindings).toBe(0);
    expect(diagnostic.score.byCriterion).toHaveLength(20);
    for (const entry of diagnostic.score.byCriterion) {
      expect(entry.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(entry.densityPer100Words).toBe(0);
    }
    expect(diagnostic.metrics.words).toBeGreaterThan(0);
    expect(diagnostic.metrics.sentences).toBe(2);
  });
});

describe("analyze — documento com um finding", () => {
  it("uma frase longa gera exatamente um finding com os campos corretos", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 5, errorAbove: 100 } };
    const text = "Esta é uma frase propositalmente longa para ultrapassar o limite de alerta configurado no teste.";

    const diagnostic = analyze(text, config);

    expect(diagnostic.findings).toHaveLength(1);
    const [finding] = diagnostic.findings;
    expect(finding.criterion).toBe("long_sentence");
    expect(finding.category).toBe("syntactic");
    expect(finding.principle).toBe("5.3.4");
    expect(finding.severity).toBe("warning");
    expect(finding.requiresHuman).toBe(true);
    expect(finding.suggestion).toBeUndefined();

    expect(diagnostic.score.totalFindings).toBe(1);
    expect(diagnostic.score.byCriterion[0].count.warning).toBe(1);
  });
});

describe("analyze — múltiplos findings", () => {
  it("várias frases longas geram um finding por frase, todos contabilizados no placar", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 1000 } };
    const text = "Uma frase bem longa para o teste. Outra frase também bem longa aqui. Mais uma frase igualmente longa.";
    const diagnostic = analyze(text, config);

    expect(diagnostic.findings).toHaveLength(3);
    expect(diagnostic.score.totalFindings).toBe(3);
    expect(diagnostic.score.byCriterion[0].count.warning).toBe(3);
  });
});

describe("sortFindings — ordenação canônica independente da ordem de entrada", () => {
  function finding(overrides: Partial<Finding>): Finding {
    return {
      criterion: "long_sentence",
      category: "syntactic",
      principle: "5.3.4",
      span: { start: 0, end: 1, text: "x" },
      severity: "warning",
      requiresHuman: true,
      justification: "j",
      ...overrides,
    };
  }

  it("ordena por span.start, span.end, criterion e principle, nessa ordem", () => {
    const a = finding({ span: { start: 10, end: 20, text: "a" } });
    const b = finding({ span: { start: 0, end: 5, text: "b" } });
    const c = finding({ span: { start: 0, end: 10, text: "c" } });
    const d = finding({ span: { start: 0, end: 5, text: "d" }, criterion: "aaa_criterion" });
    const e = finding({ span: { start: 0, end: 5, text: "e" }, criterion: "aaa_criterion", principle: "5.1" });

    const esperado = [e.span.text, d.span.text, b.span.text, c.span.text, a.span.text];

    for (const entrada of permutations([a, b, c, d, e])) {
      const resultado = sortFindings(entrada).map((f) => f.span.text);
      expect(resultado).toEqual(esperado);
    }
  });

  it("não muta o array de entrada", () => {
    const a = finding({ span: { start: 10, end: 20, text: "a" } });
    const b = finding({ span: { start: 0, end: 5, text: "b" } });
    const entrada = [a, b];
    const copiaOriginal = [...entrada];

    sortFindings(entrada);

    expect(entrada).toEqual(copiaOriginal);
  });
});

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([items[i], ...perm]);
    }
  }
  return result;
}

describe("analyze — configuração customizada", () => {
  it("limiares customizados mudam quais frases viram finding", () => {
    const text = "Frase curta de teste aqui agora.";

    const semFindings = analyze(text, DEFAULT_CONFIG);
    const comFindings = analyze(text, { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 2, errorAbove: 1000 } });

    expect(semFindings.findings).toHaveLength(0);
    expect(comFindings.findings).toHaveLength(1);
  });

  it("configs diferentes produzem configHash diferentes", () => {
    const text = "Texto qualquer para o teste de hash.";

    const padrao = analyze(text);
    const customizado = analyze(text, { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 2, errorAbove: 4 } });

    expect(customizado.meta.configHash).not.toBe(padrao.meta.configHash);
  });
});

describe("analyze — métricas integradas", () => {
  it("Diagnostic.metrics é idêntico ao que runMetrics(buildDocument(texto)) produziria isoladamente", () => {
    const text = "O gato subiu no telhado rapidamente. O cachorro correu atrás dele por muito tempo.";

    const diagnostic = analyze(text);
    const metricasIndependentes = runMetrics(buildDocument(text), DEFAULT_CONFIG);

    expect(diagnostic.metrics).toEqual(metricasIndependentes);
  });
});

describe("analyze — offsets preservados", () => {
  it("span de cada finding reconstrói exatamente o trecho via slice de Diagnostic.text", () => {
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 1000 } };
    const text = "Primeira frase bem longa para o teste. Segunda frase também bem longa aqui.";

    const diagnostic = analyze(text, config);

    expect(diagnostic.findings.length).toBeGreaterThan(0);
    for (const finding of diagnostic.findings) {
      expect(diagnostic.text.slice(finding.span.start, finding.span.end)).toBe(finding.span.text);
    }
  });
});

describe("analyze — execução repetida byte-idêntica", () => {
  it("mesma entrada produz sempre o mesmo JSON (config default)", () => {
    const text =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br sobre um assunto qualquer. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo! A saída foi rápida e a saúde, ótima.";

    const r1 = JSON.stringify(analyze(text));
    const r2 = JSON.stringify(analyze(text));

    expect(r2).toBe(r1);
  });

  it("mesma entrada produz sempre o mesmo JSON (config customizada)", () => {
    const text = "Primeira frase bem longa para o teste. Segunda frase também bem longa aqui.";
    const config: Config = { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 3, errorAbove: 6 } };

    const r1 = JSON.stringify(analyze(text, config));
    const r2 = JSON.stringify(analyze(text, config));

    expect(r2).toBe(r1);
  });
});

describe("analyze — ausência de findings nunca vira 'aprovado'", () => {
  it("Diagnostic e Score não têm nenhum campo de aprovação, mesmo sem findings", () => {
    const diagnostic = analyze("Frase curta.");

    expect(Object.keys(diagnostic).sort()).toEqual(["findings", "meta", "metrics", "score", "text"]);
    expect(Object.keys(diagnostic.score).sort()).toEqual(["byCriterion", "totalFindings"]);

    const json = JSON.stringify(diagnostic).toLowerCase();
    expect(json).not.toContain("aprovad");
    expect(json).not.toContain("approved");
    expect(json).not.toContain('"ok"');
  });
});

describe("analyzer — ausência de imports proibidos", () => {
  const arquivos = ["core/analyzer.ts", "core/score/index.ts", "core/document/model.ts", "core/metrics/index.ts"];

  it.each(arquivos)("%s não importa probe/report/react/next/rede", (arquivoRelativo) => {
    const caminho = path.join(__dirname, "..", "src", "lucid", arquivoRelativo);
    const fonte = readFileSync(caminho, "utf-8");

    expect(fonte).not.toMatch(/from\s+["'].*\/probe/);
    expect(fonte).not.toMatch(/from\s+["'].*\/report/);
    expect(fonte).not.toMatch(/from\s+["']react/);
    expect(fonte).not.toMatch(/from\s+["']next/);
    expect(fonte).not.toMatch(/https?:\/\//);
    expect(fonte).not.toMatch(/\bfetch\(/);
  });
});
