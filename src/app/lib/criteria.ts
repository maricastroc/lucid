import type { Finding, PrincipleGroup, Severity } from "@/lucid";
import type { CriterionCoverage } from "@/report/eval/contract";
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";
import type { UiCriterionId } from "../locale/criteria";
import { CRITERION_ORDER } from "../presentation/order";

export type Criterion = UiCriterionId;
export type { Channel, CriterionMeta, CriterionText } from "../presentation/types";
export { coverageOf, criterionOrder, hasPresentation, metaFor } from "../presentation/registry";
export { CRITERION_ORDER };
export type { CriterionCoverage };

export function coverageLabel(coverage: CriterionCoverage, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).taxonomy.coverage[coverage];
}

export function findingId(f: Finding): string {
  return `${f.criterion}:${f.span.start}:${f.span.end}`;
}

const CRITERION_RANK: Record<string, number> = Object.fromEntries(CRITERION_ORDER.map((c, i) => [c, i]));

export function criterionRank(criterion: string): number {
  return CRITERION_RANK[criterion] ?? CRITERION_ORDER.length;
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 };
export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}
export function severityInkVar(sev: Severity): string {
  if (sev === "error") return "var(--sev-error)";
  if (sev === "warning") return "var(--sev-warn)";
  return "var(--sev-info)";
}

export function severityLabel(sev: Severity, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).taxonomy.severity[sev];
}

export const SEVERITY_LABEL: Record<Severity, string> = copyFor("pt-BR").taxonomy.severity;

export type ActionState = "safe" | "human";

export function actionStateOf(f: Finding): ActionState {
  return f.suggestion !== undefined && !f.requiresHuman ? "safe" : "human";
}
export function isSafe(f: Finding): boolean {
  return actionStateOf(f) === "safe";
}

export function requiresHumanThroughout(findings: readonly Finding[]): boolean {
  return findings.length > 0 && findings.every((f) => f.requiresHuman);
}

export function principleGroupLabel(group: PrincipleGroup, lang: UiLang = DEFAULT_UI_LANG): string {
  return copyFor(lang).taxonomy.principleGroup[group];
}

export const DEFAULT_ANALYSIS_LOCALE = "pt-BR";

export function localeTag(localeId: string): string {
  return localeId.toUpperCase();
}

export function provenanceLabel(
  f: Finding,
  lang: UiLang = DEFAULT_UI_LANG,
  localeId: string = DEFAULT_ANALYSIS_LOCALE,
): string {
  const t = copyFor(lang).taxonomy;
  if (f.source === "iso-24495-1" && f.normativeReference) {
    return `${f.normativeReference.standard} · ${f.normativeReference.section}`;
  }
  if (f.source === "editorial") return t.editorialExtension(localeTag(localeId));
  if (f.source === "organizational") return t.organizational;
  return t.structuralHeuristic;
}

export function provenanceTag(
  f: Finding,
  lang: UiLang = DEFAULT_UI_LANG,
  localeId: string = DEFAULT_ANALYSIS_LOCALE,
): { text: string; title: string } {
  const t = copyFor(lang).taxonomy;
  if (f.source === "iso-24495-1" && f.normativeReference) {
    return {
      text: f.normativeReference.section,
      title: `${f.normativeReference.standard} · ${f.normativeReference.section}`,
    };
  }
  if (f.source === "editorial") {
    const tag = localeTag(localeId);
    return { text: t.editorialExtensionTag(tag), title: t.editorialExtensionTitle(tag) };
  }
  if (f.source === "organizational") {
    return { text: t.organizationalTag, title: t.organizationalTitle };
  }
  return { text: t.structuralHeuristicTag, title: t.structuralHeuristicTitle };
}

export function orderFindingsForIndex(findings: readonly Finding[]): Finding[] {
  const maxSev = new Map<string, number>();
  const volume = new Map<string, number>();
  for (const f of findings) {
    maxSev.set(f.criterion, Math.max(maxSev.get(f.criterion) ?? 0, severityRank(f.severity)));
    volume.set(f.criterion, (volume.get(f.criterion) ?? 0) + 1);
  }
  return [...findings].sort((a, b) => {
    const bySeverity = (maxSev.get(b.criterion) ?? 0) - (maxSev.get(a.criterion) ?? 0);
    if (bySeverity !== 0) return bySeverity;
    const byVolume = (volume.get(b.criterion) ?? 0) - (volume.get(a.criterion) ?? 0);
    if (byVolume !== 0) return byVolume;
    const byRank = criterionRank(a.criterion) - criterionRank(b.criterion);
    if (byRank !== 0) return byRank;
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    return a.span.end - b.span.end;
  });
}

export function formatWeight(value: number, lang: UiLang): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString(lang === "pt-BR" ? "pt-BR" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
