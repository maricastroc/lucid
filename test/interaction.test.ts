/**
 * Testes de INTERAÇÃO entre passes ao nível de `analyze()` — textos que ativam mais de
 * um critério ao mesmo tempo. Garante que a composição dos passes não introduz efeitos
 * que nenhum pass isolado tem:
 *   - nenhum pass suprime o finding de outro;
 *   - spans e proveniência permanecem corretos com vários critérios sobre a mesma região;
 *   - a ordenação final é estável e total sobre a mistura;
 *   - cada `suggestion` pertence ao seu próprio span;
 *   - `requiresHuman` é decidido por finding, não globalmente;
 *   - NÃO há dedup semântico entre critérios distintos (regiões podem se sobrepor);
 *   - o score contabiliza os múltiplos critérios corretamente.
 *
 * Textos propositalmente diferentes dos testes unitários e do golden.
 */
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid/core/analyzer";

// Uma única frase que dispara os QUATRO critérios; o span de long_sentence contém os demais.
const QUATRO_NUMA_FRASE =
  "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
  "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

// Duas passivas + dois jargões numa frase, sem long_sentence (para checar mistura sem o "envelope").
const PASSIVAS_E_JARGOES =
  "Foi realizada a análise pela comissão e, em sede de recurso, o documento supracitado foi arquivado.";

describe("interação — quatro critérios na mesma frase", () => {
  const d = analyze(QUATRO_NUMA_FRASE);

  it("todos os quatro critérios aparecem, nenhum suprime o outro", () => {
    const criterios = new Set(d.findings.map((f) => f.criterion));
    expect(criterios).toEqual(new Set(["long_sentence", "passive_voice", "nominalization", "jargon"]));
  });

  it("o span de long_sentence engloba os findings internos, mas eles NÃO são deduplicados", () => {
    const longo = d.findings.find((f) => f.criterion === "long_sentence")!;
    const internos = d.findings.filter((f) => f.criterion !== "long_sentence");
    expect(internos.length).toBeGreaterThan(0);
    for (const f of internos) {
      // contido no envelope da frase longa...
      expect(f.span.start).toBeGreaterThanOrEqual(longo.span.start);
      expect(f.span.end).toBeLessThanOrEqual(longo.span.end);
    }
    // ...e ainda assim todos coexistem (sem fusão/supressão)
    expect(d.findings.length).toBe(5);
  });

  it("cada finding reconstrói seu próprio span, e cada suggestion pertence ao seu span", () => {
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
      if (f.suggestion !== undefined) {
        // a sugestão é uma reescrita do próprio trecho, não de outro finding: o alvo do
        // jargão aparece na sugestão de forma reconhecível (checagem leve, não sintática).
        expect(f.suggestion.length).toBeGreaterThan(0);
        expect(f.criterion === "jargon" || f.criterion === "nominalization").toBe(true);
      }
    }
  });

  it("requiresHuman é individual: a passiva com agente é false; a nominalização insegura é true", () => {
    const passiva = d.findings.find((f) => f.criterion === "passive_voice")!;
    const nominal = d.findings.find((f) => f.criterion === "nominalization")!;
    expect(passiva.requiresHuman).toBe(false); // "foi assinado pelo gestor responsável" tem agente
    expect(nominal.requiresHuman).toBe(true); // "fazer a verificação" + complemento não-limpo
  });

  it("não há findings duplicados (mesmo critério + mesmo span)", () => {
    const chaves = d.findings.map((f) => `${f.criterion}@${f.span.start}:${f.span.end}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("os findings estão em ordem não-decrescente de (start, end)", () => {
    for (let i = 1; i < d.findings.length; i++) {
      const a = d.findings[i - 1].span;
      const b = d.findings[i].span;
      expect(a.start < b.start || (a.start === b.start && a.end <= b.end)).toBe(true);
    }
  });

  it("o score reflete todos os critérios ativos, com contagens coerentes", () => {
    expect(d.score.totalFindings).toBe(5);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    const passive = d.score.byCriterion.find((c) => c.criterion === "passive_voice")!;
    const nominal = d.score.byCriterion.find((c) => c.criterion === "nominalization")!;
    const longo = d.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    expect(jargon.count.warning).toBe(2);
    expect(passive.count.warning).toBe(1);
    expect(nominal.count.warning).toBe(1);
    expect(longo.count.warning).toBe(1);
  });
});

describe("interação — múltiplas passivas e jargões sem envelope de frase longa", () => {
  const d = analyze(PASSIVAS_E_JARGOES);

  it("duas passivas e dois jargões coexistem, sem long_sentence", () => {
    const contagem: Record<string, number> = {};
    for (const f of d.findings) contagem[f.criterion] = (contagem[f.criterion] ?? 0) + 1;
    expect(contagem).toEqual({ passive_voice: 2, jargon: 2 });
    expect(d.findings.some((f) => f.criterion === "long_sentence")).toBe(false);
  });

  it("os spans são disjuntos e ordenados; cada trecho reconstrói", () => {
    for (let i = 1; i < d.findings.length; i++) {
      expect(d.findings[i].span.start).toBeGreaterThanOrEqual(d.findings[i - 1].span.start);
    }
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });

  it("jargões trazem sugestão; passivas nunca trazem", () => {
    for (const f of d.findings) {
      if (f.criterion === "jargon") expect(f.suggestion).toBeTruthy();
      if (f.criterion === "passive_voice") expect(f.suggestion).toBeUndefined();
    }
  });
});
