/**
 * Tier 2 · ação estrutural assistida (determinística) — ANDAIME DA VOZ PASSIVA.
 *
 * Para uma passiva COM AGENTE, expõe os papéis já localizados pelo pass (`passive-voice.ts`
 * grava os offsets em `finding.meta`) para o autor montar a voz ativa: quem agiu (agente),
 * o que fez (ação) e sobre o quê (objeto). É um SINAL, não uma reescrita — rotulado
 * "estrutura identificada, confira". A ferramenta NUNCA vira a frase sozinha (isso exige
 * reordenar sujeito/objeto e reconjugar — fora da garantia mecânica, ADR-006/011) e NUNCA
 * inventa um papel: cada campo ou vem literal do texto, ou é `null`. Ver ADR-013.
 *
 * Determinístico e puro: lê offsets do finding + o texto, e um verbo-base de uma TABELA
 * FECHADA (`participios-infinitivo.pt.json`) — sem conjugador produtivo. Vive em `core/**`
 * (zero rede/LLM, coberto pela cerca).
 */
import type { Finding } from "../types";
import infinitiveData from "../../data/participios-infinitivo.pt.json";

const PARTICIPLE_TO_INFINITIVE: Readonly<Record<string, string>> = infinitiveData.map;

export interface PassiveScaffold {
  /** o agente literal (o sintagma após "pela/pelo…"), que vira o SUJEITO da ativa. */
  agent: string;
  /** a ação: o particípio como está no texto + o verbo-base, se estiver na tabela fechada. */
  action: { participle: string; baseVerb: string | null };
  /**
   * candidato a OBJETO da ativa — que é o SUJEITO da passiva, o sintagma antes de "ser"
   * ("O pedido foi aprovado…" → "O pedido"). Região limpa (início da frase → âncora), mas
   * aproximada (pode arrastar um adjunto inicial) — a UI rotula "confira". `null` quando a
   * frase começa no próprio verbo (ex.: "Foi aprovado…"), caso em que não há sujeito antes.
   */
  object: string | null;
}

function metaNum(finding: Finding, key: string): number | null {
  const value = finding.meta?.[key];
  return typeof value === "number" ? value : null;
}

/**
 * Normaliza um particípio para a forma masculina singular (chave da tabela), desfazendo
 * apenas a concordância REGULAR de gênero/número — não é conjugação: "aprovadas" →
 * "aprovado", "realizada" → "realizado", "entregues" → "entregue".
 */
function toMasculineSingular(participleLower: string): string {
  let s = participleLower;
  if (s.endsWith("s")) s = s.slice(0, -1);
  if (s.endsWith("a")) s = `${s.slice(0, -1)}o`;
  return s;
}

function baseVerbOf(participle: string): string | null {
  return PARTICIPLE_TO_INFINITIVE[toMasculineSingular(participle.toLowerCase())] ?? null;
}

/**
 * Apara espaço e pontuação de fronteira das pontas de um papel — o pass absorve, por
 * política, o ponto final que fecha a frase-agente ("…pela comissão." → "comissão."), e
 * aqui ele não faz parte do papel. Não toca no interior do sintagma.
 */
function trimRole(text: string): string {
  return text.replace(/^[\s.,;:!?…]+/u, "").replace(/[\s.,;:!?…]+$/u, "");
}

/**
 * Monta o andaime a partir de um finding de voz passiva COM AGENTE. Retorna `null` quando
 * o finding não é passiva-com-agente ou não traz os offsets de papel (ex.: passiva sem
 * agente, que a UI trata com orientação própria). Puro; `source` é o texto normalizado
 * (`Diagnostic.text`), a mesma base dos offsets.
 */
export function passiveScaffold(finding: Finding, source: string): PassiveScaffold | null {
  if (finding.criterion !== "passive_voice" || finding.meta?.hasAgent !== true) return null;

  const participleStart = metaNum(finding, "participleStart");
  const participleEnd = metaNum(finding, "participleEnd");
  const agentMarkerEnd = metaNum(finding, "agentMarkerEnd");
  const agentEnd = metaNum(finding, "agentEnd");
  const subjectStart = metaNum(finding, "subjectStart");
  if (
    participleStart === null ||
    participleEnd === null ||
    agentMarkerEnd === null ||
    agentEnd === null ||
    subjectStart === null
  ) {
    return null;
  }

  const participle = source.slice(participleStart, participleEnd);
  const agent = trimRole(source.slice(agentMarkerEnd, agentEnd));
  // sujeito da passiva = objeto da ativa: do início da frase até a âncora "ser".
  const objectRegion = trimRole(source.slice(subjectStart, finding.span.start));

  return {
    agent,
    action: { participle, baseVerb: baseVerbOf(participle) },
    object: objectRegion.length > 0 ? objectRegion : null,
  };
}
