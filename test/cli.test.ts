import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args";
import { auditText, crossesThreshold, positionAt } from "../src/cli/audit";
import { missingPhrase, renderCoverage, renderJson, renderText } from "../src/cli/render";
import { coverageReport } from "../src/lucid";

const JURIDIQUES =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo.";

describe("parseArgs — options", () => {
  it("takes the file list and applies the defaults", () => {
    const parsed = parseArgs(["a.txt", "b.md"]);
    expect(parsed).toMatchObject({
      ok: true,
      options: { paths: ["a.txt", "b.md"], format: "text", failOn: "never", criteria: [], quiet: false },
    });
  });

  it("reads format, threshold and repeated criteria", () => {
    const parsed = parseArgs([
      "--format",
      "json",
      "--fail-on",
      "error",
      "--criterion",
      "jargon",
      "--criterion",
      "long_sentence",
      "doc.txt",
    ]);
    expect(parsed).toMatchObject({
      ok: true,
      options: { format: "json", failOn: "error", criteria: ["jargon", "long_sentence"], paths: ["doc.txt"] },
    });
  });

  it("does not repeat a criterion given twice", () => {
    const parsed = parseArgs(["--criterion", "jargon", "--criterion", "jargon", "doc.txt"]);
    expect(parsed.ok && parsed.options.criteria).toEqual(["jargon"]);
  });

  it("treats a lone dash as standard input, not as an option", () => {
    expect(parseArgs(["-"])).toMatchObject({ ok: true, options: { paths: ["-"] } });
  });

  it("rejects an unknown format, criterion, severity and option", () => {
    expect(parseArgs(["--format", "xml"])).toMatchObject({ ok: false });
    expect(parseArgs(["--criterion", "inventado"])).toMatchObject({ ok: false });
    expect(parseArgs(["--fail-on", "critico"])).toMatchObject({ ok: false });
    expect(parseArgs(["--nao-existe"])).toMatchObject({ ok: false });
  });

  it("rejects a flag whose value is missing", () => {
    expect(parseArgs(["--format"])).toMatchObject({ ok: false });
    expect(parseArgs(["--criterion", "--quiet"])).toMatchObject({ ok: false });
  });
});

describe("positionAt — offsets become line and column", () => {
  it("counts from 1 on the first line", () => {
    expect(positionAt("Primeira frase.", 0)).toEqual({ line: 1, column: 1 });
    expect(positionAt("Primeira frase.", 9)).toEqual({ line: 1, column: 10 });
  });

  it("restarts the column after each line break", () => {
    const text = "Primeira\nSegunda\n\nQuarta";
    expect(positionAt(text, 9)).toEqual({ line: 2, column: 1 });
    expect(positionAt(text, 18)).toEqual({ line: 4, column: 1 });
  });
});

describe("crossesThreshold — the cut is the author's, never the tool's", () => {
  const counts = { info: 3, warning: 2, error: 0 };

  it("counts the declared severity and everything above it", () => {
    expect(crossesThreshold(counts, "info")).toBe(true);
    expect(crossesThreshold(counts, "warning")).toBe(true);
    expect(crossesThreshold(counts, "error")).toBe(false);
  });

  it("stays false when nothing was found", () => {
    expect(crossesThreshold({ info: 0, warning: 0, error: 0 }, "info")).toBe(false);
  });
});

describe("auditText — the engine seen through the CLI", () => {
  it("finds the same thing the engine finds and orders it", () => {
    const audited = auditText("doc.txt", JURIDIQUES, []);
    expect(audited.findings.length).toBeGreaterThan(0);
    expect(audited.findings.map((f) => f.span.start)).toEqual(
      [...audited.findings.map((f) => f.span.start)].sort((a, b) => a - b),
    );
    expect(audited.counts.warning).toBeGreaterThan(0);
  });

  it("keeps only the requested criteria", () => {
    const audited = auditText("doc.txt", JURIDIQUES, ["jargon"]);
    expect(audited.findings.every((f) => f.criterion === "jargon")).toBe(true);
  });

  it("reports an empty document without inventing a finding", () => {
    const audited = auditText("vazio.txt", "", []);
    expect(audited.findings).toEqual([]);
    expect(audited.counts).toEqual({ info: 0, warning: 0, error: 0 });
  });
});

describe("render — the output never turns into approval", () => {
  const audited = auditText("doc.txt", JURIDIQUES, []);

  it("states in text that measuring is not approving", () => {
    const out = renderText([audited], false);
    expect(out).toContain("mede, não aprova");
    expect(out).toContain("listas curadas");
  });

  it("carries the same caveats in the JSON payload", () => {
    const payload = JSON.parse(renderJson([audited]));
    expect(payload.caveats).toHaveLength(2);
    expect(payload.caveats[0]).toContain("não aprova");
  });

  it("says nothing was found without ever saying it passed", () => {
    const clean = renderText([auditText("limpo.txt", "O prazo acaba hoje.", [])], false);
    expect(clean).toContain("nenhum achado");
    expect(clean.toLowerCase()).not.toContain("aprovado");
    expect(clean).toContain("não é atestado de clareza");
  });

  it("stamps every finding with its criterion, provenance and position", () => {
    const payload = JSON.parse(renderJson([audited]));
    const finding = payload.files[0].findings[0];
    expect(finding).toMatchObject({ criterion: expect.any(String), justification: expect.any(String) });
    expect(finding.position).toMatchObject({ line: expect.any(Number), column: expect.any(Number) });
    expect(payload.engine.standardVersion).toContain("ISO 24495-1");
  });

  it("cites the ISO section in text only for criteria that have one", () => {
    const out = renderText([auditText("doc.txt", "Foi realizada a análise pela comissão.", [])], false);
    expect(out).toContain("ISO 5.3");
  });
});

describe("render — determinism, the property the CLI exists to sell", () => {
  it("produces byte-identical text for the same input", () => {
    const a = renderText([auditText("doc.txt", JURIDIQUES, [])], false);
    const b = renderText([auditText("doc.txt", JURIDIQUES, [])], false);
    expect(b).toBe(a);
  });

  it("produces byte-identical JSON, with no timestamp inside", () => {
    const a = renderJson([auditText("doc.txt", JURIDIQUES, [])]);
    const b = renderJson([auditText("doc.txt", JURIDIQUES, [])]);
    expect(b).toBe(a);
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe("--coverage — the map of what the engine does not look at", () => {
  it("is off by default and turns on by flag, without consuming a path", () => {
    expect(parseArgs(["doc.txt"])).toMatchObject({ ok: true, options: { coverage: false } });
    expect(parseArgs(["--coverage"])).toMatchObject({ ok: true, options: { coverage: true, paths: [] } });
  });

  it("names every clause and every criterion that has no clause", () => {
    const report = coverageReport();
    const out = renderCoverage(report, false);

    for (const clause of report.clauses) expect(out).toContain(clause.section);
    for (const entry of report.outsideStandard) expect(out).toContain(entry.criterion);
  });

  it("publishes no coverage percentage while the clause tree is incomplete", () => {
    const out = renderCoverage(coverageReport(), false);
    expect(out).not.toMatch(/\d+\s?%/);
  });

  it("separates a clause out of reach from a clause merely unbuilt", () => {
    const out = renderCoverage(coverageReport(), false);
    expect(out).toContain("fora de alcance");
    expect(out).toContain("não é pendência");
  });

  it("renders byte-identically across runs", () => {
    expect(renderCoverage(coverageReport(), false)).toBe(renderCoverage(coverageReport(), false));
  });
});

describe("silence — the audit says what it could not look at", () => {
  const PROSE = "O documento supracitado foi juntado aos autos.";
  const MARKED = "# Título curto\n\nO documento supracitado foi juntado aos autos.\n\n- Um item\n- Outro item";

  it("names the criteria that had no object in a prose document", () => {
    expect(auditText("prosa.txt", PROSE, []).silent).toEqual([
      "heading_body_mismatch",
      "long_heading",
      "salto_de_nivel_titulo",
      "single_item_list",
    ]);
  });

  it("stays quiet when the document declares structure", () => {
    expect(auditText("estrutura.txt", MARKED, []).silent).toEqual([]);
  });

  it("only mentions silence about criteria the author actually asked for", () => {
    expect(auditText("prosa.txt", PROSE, ["jargon"]).silent).toEqual([]);
    expect(auditText("prosa.txt", PROSE, ["long_heading"]).silent).toEqual(["long_heading"]);
  });

  it("puts the warning before the summary, so absence never reads as an all-clear", () => {
    const out = renderText([auditText("prosa.txt", PROSE, [])], true);
    const warning = out.indexOf("não encontramos");
    const summary = out.indexOf("prosa.txt: 2 achados");
    expect(warning).toBeGreaterThanOrEqual(0);
    expect(warning).toBeLessThan(summary);
    expect(out).toContain("não puderam ser avaliados");
    expect(out).toContain("Para incluí-los na auditoria");
  });

  it("carries the same fact into the json output", () => {
    const payload = JSON.parse(renderJson([auditText("prosa.txt", PROSE, [])]));
    expect(payload.files[0].criteriaWithoutObject).toHaveLength(4);
  });
});

describe("import — what the audit says about the file it was handed", () => {
  const notes = {
    tablesFlattened: 0,
    textBoxesInlined: 0,
    headingStylesRecovered: [] as readonly string[],
    unrecognisedParagraphStyles: [] as readonly string[],
  };
  const audited = (over: Partial<typeof notes>) => ({
    ...auditText("doc.docx", "# Título curto\n\nO documento supracitado foi juntado aos autos.\n\n- Um\n- Dois", []),
    importNotes: { ...notes, ...over },
  });

  it("says nothing when nothing was rebuilt or flattened", () => {
    expect(renderText([audited({})], true)).not.toContain("achatada");
    expect(renderText([audited({})], true)).not.toContain("reconstruídos");
  });

  it("names the styles whose headings it rebuilt", () => {
    const out = renderText([audited({ headingStylesRecovered: ["Título 1", "Título 3"] })], true);
    expect(out).toContain("Título 1, Título 3");
    expect(out).toContain("o próprio arquivo declara");
  });

  it("counts what it flattened and says the arrangement did not survive", () => {
    const out = renderText([audited({ tablesFlattened: 2, textBoxesInlined: 1 })], true);
    expect(out).toContain("2 tabelas e 1 caixa de texto");
    expect(out).toContain("a disposição não");
  });

  it("names only the structure that is actually absent", () => {
    expect(missingPhrase(["list"])).toBe("listas");
    expect(missingPhrase(["heading"])).toBe("títulos");
    expect(missingPhrase(["heading", "list"])).toBe("títulos nem listas");
  });
});
