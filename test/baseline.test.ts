import { describe, expect, it } from "vitest";
import { analyze, DEFAULT_CONFIG, type Config } from "../src/lucid";
import {
  acceptBaseline,
  baselineFile,
  baselineFileName,
  buildBaseline,
  compareToBaseline,
  divergenceOf,
  foldExcerpt,
  parseBaseline,
  profileMatches,
  rebaseline,
  serializeBaseline,
  type Baseline,
} from "../src/app/lib/baseline";
import { profileConfig } from "../src/app/lib/profiles";
import { EMPTY_MARKS, withMark, withNote } from "../src/app/lib/review-marks";

const V1 =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
  "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
  "benefício, e a decisão foi comunicada ao interessado no processo.";

const V2 =
  "A comissão analisou o documento em sede de procedimento administrativo. A comissão verificou as " +
  "condições citadas acima e comunicou a decisão ao interessado.";

function baselineOf(text = V1, config: Config = DEFAULT_CONFIG, marks = EMPTY_MARKS): Baseline {
  const diagnostic = analyze(text, config);
  return buildBaseline({
    title: "Edital 04/2026 — v1",
    savedAt: "30/08/2026",
    text,
    blocks: null,
    diagnostic,
    findings: diagnostic.findings,
    profileId: "base",
    config,
    marks,
    vocabulary: [],
  });
}

describe("the starting point — what it carries", () => {
  it("keeps the text, because that is what makes it re-measurable later", () => {
    const baseline = baselineOf();
    expect(baseline.source.text).toBe(V1);
    expect(baseline.historical.findings.length).toBeGreaterThan(0);
  });

  it("keeps the audit of the time as a record, stamped with the ruler that produced it", () => {
    const baseline = baselineOf();
    const live = analyze(V1);
    expect(baseline.historical.stamp).toEqual(live.meta);
    expect(baseline.historical.findings).toHaveLength(live.findings.length);
  });

  it("carries the decisions the author had already taken, with their reasons", () => {
    const diagnostic = analyze(V1);
    const jargon = diagnostic.findings.filter((f) => f.criterion === "jargon");
    const marks = withNote(withMark(EMPTY_MARKS, jargon[0], "dismissed"), jargon[0], "Termo do edital-padrão.");

    const baseline = baselineOf(V1, DEFAULT_CONFIG, marks);
    expect(baseline.decisions).toEqual([
      { criterion: "jargon", excerpt: jargon[0].span.text, kind: "dismissed", note: "Termo do edital-padrão." },
    ]);
  });

  it("records a decision with no reason as one without inventing text for it", () => {
    const diagnostic = analyze(V1);
    const marks = withMark(EMPTY_MARKS, diagnostic.findings[0], "seen");
    expect(baselineOf(V1, DEFAULT_CONFIG, marks).decisions[0].note).toBeNull();
  });
});

describe("the starting point — one ruler on both sides", () => {
  it("re-measures the saved text instead of trusting the numbers stored with it", () => {
    const baseline = baselineOf();
    expect(rebaseline(baseline, DEFAULT_CONFIG).length).toBe(analyze(V1).findings.length);
  });

  it("re-measures under the profile in force now, not the one saved with it", () => {
    const noJargon: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, enabled: false } };
    const baseline = baselineOf(V1, DEFAULT_CONFIG);

    const underSaved = rebaseline(baseline, DEFAULT_CONFIG).length;
    const underCurrent = rebaseline(baseline, noJargon).length;
    expect(underCurrent).toBeLessThan(underSaved);
    expect(compareToBaseline(baseline, analyze(V2, noJargon), noJargon).rebasedCount).toBe(underCurrent);
  });

  it("compares the re-measured count, never the historical one", () => {
    const noJargon: Config = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, enabled: false } };
    const comparison = compareToBaseline(baselineOf(), analyze(V2, noJargon), noJargon);

    expect(comparison.historicalCount).toBe(analyze(V1).findings.length);
    expect(comparison.rebasedCount).toBe(analyze(V1, noJargon).findings.length);
    expect(comparison.rebasedCount).not.toBe(comparison.historicalCount);

    const counted = comparison.byCriterion.reduce((sum, row) => sum + row.before, 0);
    expect(counted).toBe(comparison.rebasedCount);
  });

  it("re-measuring is a no-op when the ruler has not moved — that is why it is unconditional", () => {
    const comparison = compareToBaseline(baselineOf(), analyze(V2), DEFAULT_CONFIG);
    expect(comparison.rebasedCount).toBe(comparison.historicalCount);
    expect(comparison.divergence).toEqual([]);
  });

  it("names every stamp field where the saved audit and the current ruler disagree", () => {
    const live = analyze(V1).meta;
    expect(divergenceOf(live, live)).toEqual([]);
    expect(divergenceOf({ ...live, dataHash: "old", configHash: "old" }, live).sort()).toEqual([
      "configHash",
      "dataHash",
    ]);
  });

  it("knows whether the saved profile is the one in force, so adopting it can be offered", () => {
    const baseline = baselineOf();
    expect(profileMatches(baseline, DEFAULT_CONFIG)).toBe(true);
    expect(profileMatches(baseline, profileConfig("publico"))).toBe(false);
  });
});

describe("the starting point — what survived, and nothing more", () => {
  it("lists an excerpt the earlier audit raised that the current text raises again", () => {
    const comparison = compareToBaseline(baselineOf(), analyze(V2), DEFAULT_CONFIG);
    const jargon = comparison.stillThere.filter((point) => point.criterion === "jargon");

    expect(jargon.map((point) => point.excerpt)).toContain("em sede de");
  });

  it("leaves out an excerpt the current text no longer raises", () => {
    const comparison = compareToBaseline(baselineOf(), analyze(V2), DEFAULT_CONFIG);
    expect(comparison.stillThere.map((point) => point.excerpt)).not.toContain("supracitadas");
  });

  it("counts repeated excerpts by the smaller side, never claiming which occurrence is which", () => {
    const twice = "Foi indeferido em sede de análise. O pedido foi negado em sede de recurso.";
    const once = "A comissão negou o pedido em sede de recurso.";
    const comparison = compareToBaseline(baselineOf(twice), analyze(once), DEFAULT_CONFIG);
    const point = comparison.stillThere.find((item) => item.excerpt === "em sede de");

    expect(point?.count).toBe(1);
  });

  it("matches case and spacing, and keeps accents apart", () => {
    expect(foldExcerpt("  Em   SEDE  de ")).toBe("em sede de");
    expect(foldExcerpt("público")).not.toBe(foldExcerpt("publico"));
  });

  it("brings the earlier decision along, so a surviving point is not re-litigated", () => {
    const diagnostic = analyze(V1);
    const kept = diagnostic.findings.find((f) => f.span.text === "em sede de")!;
    const marks = withNote(withMark(EMPTY_MARKS, kept, "dismissed"), kept, "Termo do edital-padrão.");
    const comparison = compareToBaseline(baselineOf(V1, DEFAULT_CONFIG, marks), analyze(V2), DEFAULT_CONFIG);

    const point = comparison.stillThere.find((item) => item.excerpt === "em sede de");
    expect(point?.decision).toEqual({
      criterion: "jargon",
      excerpt: "em sede de",
      kind: "dismissed",
      note: "Termo do edital-padrão.",
    });
  });

  it("says nothing about what left the text: only what survived is reported", () => {
    const comparison = compareToBaseline(baselineOf(), analyze(V2), DEFAULT_CONFIG);
    expect(Object.keys(comparison)).not.toContain("resolved");
    expect(Object.keys(comparison)).not.toContain("gone");
    expect(comparison.stillThereCount).toBeLessThanOrEqual(comparison.rebasedCount);
  });
});

describe("the starting point — travelling as a file", () => {
  it("round-trips through JSON without losing a field", () => {
    const baseline = baselineOf();
    const parsed = parseBaseline(serializeBaseline(baseline));
    expect(parsed.ok && parsed.baseline).toEqual(baseline);
  });

  it("refuses a file that is not a starting point at all", () => {
    expect(parseBaseline("not json")).toEqual({ ok: false, refusal: "unreadable" });
    expect(parseBaseline('{"nope": true}')).toEqual({ ok: false, refusal: "unreadable" });
    expect(parseBaseline("[]")).toEqual({ ok: false, refusal: "unreadable" });
  });

  it("tells a format it cannot read apart from a file it does not recognise", () => {
    const other = { ...baselineOf(), schemaVersion: 99 };
    expect(parseBaseline(JSON.stringify(other))).toEqual({ ok: false, refusal: "schema" });
  });

  it("refuses a starting point whose text was changed after it was saved", () => {
    const tampered = baselineOf();
    const edited = { ...tampered, source: { ...tampered.source, text: "outro texto" } };
    expect(parseBaseline(JSON.stringify(edited))).toEqual({ ok: false, refusal: "unreadable" });
  });

  it("refuses a starting point with no title — it is the only identity the file carries", () => {
    const untitled = { ...baselineOf(), title: "   " };
    expect(parseBaseline(JSON.stringify(untitled))).toEqual({ ok: false, refusal: "unreadable" });
  });

  it("refuses another language: not a different ruler, a different subject", () => {
    const baseline = baselineOf();
    const foreign = {
      ...baseline,
      historical: { ...baseline.historical, stamp: { ...baseline.historical.stamp, localeId: "en" } },
    };
    expect(acceptBaseline(foreign, analyze(V1).meta)).toBe("locale");
  });

  it("accepts every other divergence, because re-measuring is what makes it comparable", () => {
    const baseline = baselineOf();
    const older = {
      ...baseline,
      historical: {
        ...baseline.historical,
        stamp: { ...baseline.historical.stamp, lucidVersion: "0.0.9", dataHash: "old", configHash: "old" },
      },
    };
    expect(acceptBaseline(older, analyze(V1).meta)).toBeNull();
  });
});

describe("the vocabulary rides in the .lucid.json", () => {
  const TERMS = [{ term: "pactuação", plain: "acordo", reason: "porque sim" }];

  const saved = () => {
    const d = analyze("A pactuação segue.");
    return buildBaseline({
      title: "Edital 04/2026",
      savedAt: "01/01/2026",
      text: d.text,
      blocks: null,
      diagnostic: d,
      findings: d.findings,
      profileId: "base",
      config: DEFAULT_CONFIG,
      marks: {},
      vocabulary: TERMS,
    });
  };

  it("comes back with the same terms after a round trip through the file", () => {
    const parsed = parseBaseline(serializeBaseline(saved()));

    expect(parsed.ok && parsed.baseline.vocabulary).toEqual(TERMS);
  });

  it("still reads a file written before vocabularies existed, with an empty one", () => {
    const older = JSON.parse(serializeBaseline(saved()));
    delete older.vocabulary;
    older.schemaVersion = 1;

    const parsed = parseBaseline(JSON.stringify(older));

    expect(parsed.ok && parsed.baseline.vocabulary).toEqual([]);
  });

  it("refuses a file whose vocabulary is not a list of terms, instead of loading junk", () => {
    const broken = JSON.parse(serializeBaseline(saved()));
    broken.vocabulary = [{ term: 42 }];

    expect(parseBaseline(JSON.stringify(broken))).toEqual({ ok: false, refusal: "unreadable" });
  });
});

describe("saving the starting point before another document takes this one's place", () => {
  const fileOf = (title: string) => {
    const diagnostic = analyze(V1);
    return baselineFile({
      title,
      savedAt: "30/08/2026",
      text: V1,
      blocks: null,
      diagnostic,
      findings: diagnostic.findings,
      profileId: "base",
      config: DEFAULT_CONFIG,
      marks: withMark(EMPTY_MARKS, diagnostic.findings[0], "dismissed"),
      vocabulary: [],
    });
  };

  it("writes a file the product can attach again — that is the whole point of saving first", () => {
    const parsed = parseBaseline(fileOf("Edital 04/2026 — v1").content);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.baseline.source.text).toBe(V1);
    expect(parsed.baseline.decisions).toHaveLength(1);
    expect(acceptBaseline(parsed.baseline, analyze(V2).meta)).toBeNull();
  });

  it("compares against the next version once attached, which is what the saved file buys", () => {
    const parsed = parseBaseline(fileOf("Edital 04/2026 — v1").content);
    if (!parsed.ok) throw new Error("baseline should parse");

    const comparison = compareToBaseline(parsed.baseline, analyze(V2), DEFAULT_CONFIG);
    expect(comparison.title).toBe("Edital 04/2026 — v1");
    expect(comparison.rebasedCount).toBeGreaterThan(0);
  });

  it("names the file after the title the human declared", () => {
    expect(fileOf("Edital 04/2026 — v1").name).toBe("edital-04-2026-v1.lucid.json");
    expect(baselineFileName("Ofício nº 12 — Ação Civil")).toBe("oficio-n-12-acao-civil.lucid.json");
  });

  it("still produces a file when the title carries no letters, instead of writing '.lucid.json'", () => {
    expect(baselineFileName("——")).toBe("ponto-de-partida.lucid.json");
  });

  it("does not leave a dangling separator when a long title is cut", () => {
    const name = baselineFileName(`${"a".repeat(59)} palavra cortada`);

    expect(name.endsWith("-.lucid.json")).toBe(false);
    expect(name).toBe(`${"a".repeat(59)}.lucid.json`);
  });
});
