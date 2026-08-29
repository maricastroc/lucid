import { describe, expect, it } from "vitest";
import { analyze, checkBriefing, DEFAULT_CONFIG } from "@/lucid";
import { buildAuditReport } from "@/app/lib/audit-report";
import { escapeHtml, renderInline, renderReportHtml } from "@/app/lib/report-html";

const DOCUMENT =
  "Foi realizada a análise do documento pela comissão em sede de procedimento administrativo " +
  "destinado à verificação das condições supracitadas exigidas para a concessão do benefício.";

const ENTRY = "Foi realizada a análise do documento em sede de procedimento.";

/** A report with every section turned on: profile, briefing, trail and the entry-text appendix. */
function fullReport(originalText = ENTRY): string {
  const d = analyze(DOCUMENT);
  const briefing = { audience: "servidor", purpose: "pedir a revisão", priorKnowledge: "nada", mustFind: ["prazo"] };
  return buildAuditReport(
    d,
    d.findings,
    { generatedAt: "2026-08-29 12:00", documentTitle: "Edital" },
    [
      {
        source: "manual",
        label: "Edição do autor",
        before: "em sede de",
        after: "durante",
        burdenBefore: 6,
        burdenAfter: 5,
      },
    ],
    { briefing, check: checkBriefing(d.text, briefing) },
    { ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 25, errorAbove: 40 }, mesoclise: { enabled: false } },
    originalText,
  );
}

const stripTags = (html: string): string => html.replace(/<[^>]+>/g, "");

describe("renderReportHtml — every construct the report writes", () => {
  it("renders headings at the level the report asked for", () => {
    const html = renderReportHtml("# Um\n\n## Dois\n\n### Três");
    expect(html).toContain("<h1>Um</h1>");
    expect(html).toContain("<h2>Dois</h2>");
    expect(html).toContain("<h3>Três</h3>");
  });

  it("keeps consecutive quoted lines inside one blockquote", () => {
    const html = renderReportHtml("> Primeira\n> Segunda\n\nDepois.");
    expect(html).toBe("<blockquote><p>Primeira</p><p>Segunda</p></blockquote>\n<p>Depois.</p>");
  });

  it("keeps consecutive items inside one list", () => {
    expect(renderReportHtml("- um\n- dois")).toBe("<ul><li>um</li><li>dois</li></ul>");
  });

  it("renders a table and carries the column alignment the separator declared", () => {
    const html = renderReportHtml("| Critério | N |\n|---|--:|\n| Jargão | 2 |");
    expect(html).toContain('<th style="text-align:left">Critério</th>');
    expect(html).toContain('<th style="text-align:right">N</th>');
    expect(html).toContain('<td style="text-align:right">2</td>');
  });

  it("renders the rule that closes the report", () => {
    expect(renderReportHtml("---")).toBe("<hr />");
  });
});

describe("renderReportHtml — the document inside is text, never markup", () => {
  it("escapes markup the author wrote, instead of letting it become markup", () => {
    const html = renderReportHtml("O campo <script>alerta()</script> & o resto.");
    expect(html).toBe("<p>O campo &lt;script&gt;alerta()&lt;/script&gt; &amp; o resto.</p>");
  });

  it("escapes markup inside a code span too", () => {
    expect(renderInline("o valor `<b>x</b>`")).toBe("o valor <code>&lt;b&gt;x&lt;/b&gt;</code>");
  });

  it("escapes the quotes that would close an attribute", () => {
    expect(escapeHtml(`a"b'c`)).toBe("a&quot;b&#39;c");
  });

  it("escapes the appendix, which is the whole document verbatim", () => {
    const html = renderReportHtml(fullReport("Uma <b>tag</b> e um & solto."));
    expect(html).toContain("Uma &lt;b&gt;tag&lt;/b&gt; e um &amp; solto.");
    expect(html).not.toContain("<b>tag</b>");
  });
});

describe("renderInline — emphasis without collateral damage", () => {
  it("marks bold and italic", () => {
    expect(renderInline("**forte** e _leve_")).toBe("<strong>forte</strong> e <em>leve</em>");
  });

  it("leaves an identifier with underscores alone", () => {
    expect(renderInline("o critério sigla_sem_expansao dispara")).toBe("o critério sigla_sem_expansao dispara");
  });

  it("does not apply emphasis inside a code span", () => {
    expect(renderInline("veja `a_b_c` e `**x**`")).toBe("veja <code>a_b_c</code> e <code>**x**</code>");
  });
});

describe("renderReportHtml — a whole report reaches the page as prose", () => {
  it("leaves no markdown syntax showing", () => {
    const text = stripTags(renderReportHtml(fullReport()));
    expect(text).not.toContain("**");
    expect(text).not.toMatch(/^#{1,4}\s/m);
    expect(text).not.toMatch(/^\|/m);
    expect(text).not.toMatch(/^- /m);
    expect(text).not.toMatch(/^> /m);
    expect(text).not.toMatch(/^`{3,}/m);
  });

  it("renders every section the report can carry", () => {
    const html = renderReportHtml(fullReport());
    for (const section of [
      "Auditoria de Linguagem Simples",
      "Placar",
      "Anotações por critério",
      "Perfil editorial",
      "Princípio 1 — Relevante",
      "Alterações registradas",
      "Anexo — Texto de entrada",
    ]) {
      expect(stripTags(html)).toContain(section);
    }
  });

  it("carries the stamp that makes the audit re-runnable", () => {
    expect(stripTags(renderReportHtml(fullReport()))).toMatch(/Motor Lucid .+ · perfil .+ · dados .+ · pt-BR/);
  });

  it("keeps the appendix verbatim, even where the document looks like markdown", () => {
    const entry = "# Não é um título\n\n- não é um item\n\n| nem | tabela |";
    const html = renderReportHtml(fullReport(entry));
    expect(html).toContain(`<pre class="report-source"><code>${entry}</code></pre>`);
  });

  it("deterministic: the same report renders byte-identical HTML", () => {
    expect(renderReportHtml(fullReport())).toBe(renderReportHtml(fullReport()));
  });
});
