import type { Diagnostic, Finding, Severity } from "@/lucid";
import { CRITERION_ORDER, isSafe, metaFor, principleGroupLabel, provenanceLabel, severityRank, SEVERITY_LABEL } from "./criteria";
import { renderLedgerMarkdown, type LedgerEntry } from "./ledger";

export interface AuditReportMeta {
  generatedAt: string;
  documentTitle?: string;
}

const fmtNum = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);
const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

function bySeverityThenPosition(a: Finding, b: Finding): number {
  const s = severityRank(b.severity) - severityRank(a.severity);
  return s !== 0 ? s : a.span.start - b.span.start;
}

export function buildAuditReport(
  diagnostic: Diagnostic,
  findings: readonly Finding[],
  meta: AuditReportMeta,
  ledger: readonly LedgerEntry[] = [],
): string {
  const m = diagnostic.metrics;
  const total = findings.length;
  const sev: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const f of findings) sev[f.severity]++;
  const safe = findings.filter(isSafe).length;
  const human = total - safe;

  const out: string[] = [];
  out.push("# Auditoria de Linguagem Simples");
  out.push("");
  out.push("Análise determinística · ABNT NBR ISO 24495-1:2024 · Lucid");
  out.push(`Gerado em ${meta.generatedAt}${meta.documentTitle ? ` · ${meta.documentTitle}` : ""}`);
  out.push("");
  out.push("> **Este relatório mede, não aprova.** A ausência de anotações não é atestado de clareza.");
  out.push("> Legibilidade é sinal de apoio (Princípio 4 da norma), nunca aprovação.");
  out.push("");

  out.push("## Placar");
  out.push("");
  out.push(
    `- **${total}** ${plural(total, "anotação", "anotações")}: ` +
      `${sev.error} ${plural(sev.error, "prioritária", "prioritárias")}, ` +
      `${sev.warning} de atenção, ${sev.info} ${plural(sev.info, "leve", "leves")}`,
  );
  out.push(
    `- **${safe}** de troca direta (equivalente indicado; a aplicação é do autor) · **${human}** de decisão do autor`,
  );
  out.push(`- Palavras: ${fmtNum(m.words)} · Frases: ${fmtNum(m.sentences)} · Palavras por frase: ${fmtNum(m.wordsPerSentence)}`);
  out.push(`- Legibilidade (Flesch-PT): ${fmtNum(m.fleschPt)}`);
  out.push("");
  out.push("### Coesão (descritores)");
  out.push("");
  out.push(
    "_Descritores neutros: valor alto ou baixo não é, sozinho, aprovação nem reprovação (coesão alta pode ser " +
      "repetição; baixa pode ser variação). Não entram no placar._",
  );
  const co = m.cohesion;
  out.push(
    `- Coesão referencial (sobreposição entre frases vizinhas): ${fmtNum(co.referentialOverlap)} · ` +
      `pares sem continuidade: ${fmtNum(co.adjacentGapRatio)}`,
  );
  out.push(
    `- Conectivos por 100 palavras: ${fmtNum(co.connectivesPer100Words)} ` +
      `(aditivos ${co.connectivesByClass.additive}, adversativos ${co.connectivesByClass.adversative}, ` +
      `causais ${co.connectivesByClass.causal}, temporais ${co.connectivesByClass.temporal}, ` +
      `conclusivos ${co.connectivesByClass.conclusive})`,
  );
  out.push("");

  const counts = new Map<string, number>();
  for (const f of findings) counts.set(f.criterion, (counts.get(f.criterion) ?? 0) + 1);
  const activeRows = CRITERION_ORDER.filter((c) => (counts.get(c) ?? 0) > 0);
  if (activeRows.length > 0) {
    out.push("## Anotações por critério");
    out.push("");
    out.push("| Critério | Dimensão | Proveniência | Anotações |");
    out.push("|---|---|---|--:|");
    for (const c of activeRows) {
      const first = findings.find((f) => f.criterion === c)!;
      out.push(
        `| ${metaFor(c).label} | ${principleGroupLabel(first.principleGroup)} | ${provenanceLabel(first)} | ${counts.get(c)} |`,
      );
    }
    out.push("");
  }

  if (total > 0) {
    out.push("## Anotações");
    out.push("");
    out.push("Ordenadas por severidade (prioritário → leve).");
    out.push("");
    [...findings].sort(bySeverityThenPosition).forEach((f, i) => {
      out.push(
        `### ${i + 1}. ${metaFor(f.criterion).label} — ${SEVERITY_LABEL[f.severity]} · ${principleGroupLabel(f.principleGroup)} · ${provenanceLabel(f)}`,
      );
      out.push("");
      out.push(`> ${collapse(f.span.text)}`);
      out.push("");
      out.push(f.justification);
      if (isSafe(f) && f.suggestion !== undefined) {
        out.push("");
        out.push(`**Equivalente direto (curado):** ${f.suggestion} — indicado pela ferramenta; a troca no texto é do autor.`);
      } else if (f.requiresHuman) {
        out.push("");
        out.push("_Exige decisão humana — a ferramenta aponta, não reescreve por você._");
      }
      out.push("");
    });
  }

  const trail = renderLedgerMarkdown(ledger);
  if (trail) {
    out.push(trail);
  }

  out.push("---");
  out.push("Gerado pelo Lucid — auditoria determinística (Camada 1, sem IA). Mede, não aprova.");
  out.push("");
  return out.join("\n");
}
