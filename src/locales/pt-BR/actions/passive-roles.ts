import type { Finding } from "@/lucid/core/types";
import { sentenceSpanAt } from "@/lucid/core/document/locate";
import { getPrepared } from "../datasets/registry";
import { infinitiveFromRegularParticiple } from "./regular-morphology";

const PARTICIPLE_TO_INFINITIVE: Readonly<Record<string, string>> = getPrepared("participios-infinitivo.pt");
const ABBREVIATIONS = getPrepared("abreviacoes.pt");

const RE_LEADING_WORD = /^\p{L}+/u;

export interface PassiveRoles {
  serForm: string;
  participle: string;
  baseVerbLemma: string | null;
  hasAgent: boolean;
  agentMarker: string | null;
  agentBody: string | null;
  objectRegion: string | null;
  subjectStart: number;
  serStart: number;
  participleEnd: number;
  agentMarkerStart: number | null;
  agentEnd: number | null;
  // true quando o detector parou de estender o agente por atingir o limite de
  // tokens, e não por uma barreira sintática — o agente real continua além do
  // span capturado, então convertê-lo automaticamente cortaria o agente no meio.
  agentTruncated: boolean;
  // Advérbio/conector entre o auxiliar e o particípio ("foi apenas enviado")
  // ou entre o particípio e o agente ("enviado apenas pela comissão"). A
  // reconstrução ativa monta só sujeito+verbo+objeto — se isso existir e for
  // descartado, a conversão perde sentido silenciosamente.
  interveningModifier: string | null;
}

function metaNum(finding: Finding, key: string): number | null {
  const value = finding.meta?.[key];
  return typeof value === "number" ? value : null;
}

function trimRole(text: string): string {
  return text.replace(/^[\s.,;:!?…]+/u, "").replace(/[\s.,;:!?…]+$/u, "");
}

function toMasculineSingular(participleLower: string): string {
  let s = participleLower;
  if (s.endsWith("s")) s = s.slice(0, -1);
  if (s.endsWith("a")) s = `${s.slice(0, -1)}o`;
  return s;
}

export function baseVerbOf(participle: string): string | null {
  const mascSing = toMasculineSingular(participle.toLowerCase());
  return PARTICIPLE_TO_INFINITIVE[mascSing] ?? infinitiveFromRegularParticiple(mascSing);
}

export function extractPassiveRoles(finding: Finding, source: string): PassiveRoles | null {
  if (finding.criterion !== "passive_voice") return null;

  const participleStart = metaNum(finding, "participleStart");
  const participleEnd = metaNum(finding, "participleEnd");
  if (participleStart === null || participleEnd === null) return null;

  const serStart = finding.span.start;
  const serForm = (source.slice(serStart, participleStart).match(RE_LEADING_WORD)?.[0] ?? "").toLowerCase();
  const participle = source.slice(participleStart, participleEnd);
  const baseVerbLemma = baseVerbOf(participle);

  const subjectStart = sentenceSpanAt(source, serStart, ABBREVIATIONS).start;
  const objectRaw = trimRole(source.slice(subjectStart, serStart));
  const objectRegion = objectRaw.length > 0 ? objectRaw : null;

  const betweenSerAndParticiple = trimRole(source.slice(serStart + serForm.length, participleStart));

  if (finding.meta?.hasAgent === true) {
    const agentMarkerStart = metaNum(finding, "agentMarkerStart");
    const agentMarkerEnd = metaNum(finding, "agentMarkerEnd");
    const agentEnd = metaNum(finding, "agentEnd");
    if (agentMarkerStart === null || agentMarkerEnd === null || agentEnd === null) return null;
    const betweenParticipleAndAgent = trimRole(source.slice(participleEnd, agentMarkerStart));
    const interveningModifier = betweenSerAndParticiple || betweenParticipleAndAgent || null;
    return {
      serForm,
      participle,
      baseVerbLemma,
      hasAgent: true,
      agentMarker: source.slice(agentMarkerStart, agentMarkerEnd).toLowerCase(),
      agentBody: trimRole(source.slice(agentMarkerEnd, agentEnd)),
      objectRegion,
      subjectStart,
      serStart,
      participleEnd,
      agentMarkerStart,
      agentEnd,
      agentTruncated: finding.meta?.agentTruncated === true,
      interveningModifier,
    };
  }

  return {
    serForm,
    participle,
    baseVerbLemma,
    hasAgent: false,
    agentMarker: null,
    agentBody: null,
    objectRegion,
    subjectStart,
    serStart,
    participleEnd,
    agentMarkerStart: null,
    agentEnd: null,
    agentTruncated: false,
    interveningModifier: betweenSerAndParticiple || null,
  };
}
