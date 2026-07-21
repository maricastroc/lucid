/**
 * Pass "voz passiva analítica" (docs/ARQUITETURA.md §6, critério 2 · CLAUDE.md, critério
 * 2 do MVP) — `5.3.3`, frases claras (quem faz o quê).
 *
 * MATCHER LOCAL POR TOKENS, SEM PARSER (ADR-006 em docs/DECISOES.md resume o porquê).
 * Ancora em formas de `ser` (léxico fechado, `verbos-ser.pt.json`) — nunca em
 * `estar`/`ficar` — e procura um particípio numa janela curta e limitada de tokens à
 * frente, aceitando só conectores explicitamente reconhecidos entre os dois (negação,
 * advérbios em `-mente`, lista pequena de advérbios seguros). Qualquer coisa fora
 * desse conjunto aborta a busca — nunca "pula" tokens desconhecidos torcendo para achar
 * um particípio mais à frente.
 *
 * "tinha SIDO aprovado" e "vai SER analisado" já funcionam sem nenhuma lógica de
 * "sequência de auxiliares": `sido` e `ser` (infinitivo) já são âncoras do léxico de
 * `ser` por si só — o pass nunca precisa reconhecer `tinha`/`vai` como auxiliar.
 *
 * Depois do particípio, procura agente introduzido por `pelo/pela/pelos/pelas` (nunca
 * `por` isolado) na mesma janela — presença de agente muda `requiresHuman` para
 * `false` (o ator é recuperável do texto), nunca gera `suggestion` (reconjugar para
 * ativa não é mecanicamente seguro — I7).
 *
 * Dois léxicos de exclusão suprimem o finding quando o particípio candidato é
 * previsivelmente não-passiva: `participios-ambiguos.pt.json` (adjetivo predicativo de
 * estado, ex. "é dedicada") e `participios-falsos-nominais.pt.json` (substantivo
 * lexicalizado, ex. "foi resultado de"). Ambos curados e extensíveis, não exaustivos —
 * ver docs/DECISOES.md (ADR-006) e src/lucid/data/README.md.
 */
import type { Finding, Pass, Token } from "../types";
import serFormsData from "../../data/verbos-ser.pt.json";
import irregularParticiplesData from "../../data/participios-irregulares.pt.json";
import ambiguousParticiplesData from "../../data/participios-ambiguos.pt.json";
import nominalFalsePositivesData from "../../data/participios-falsos-nominais.pt.json";

const CRITERION = "passive_voice";
const PRINCIPLE = "5.3.3";

const SER_FORMS: ReadonlySet<string> = new Set(serFormsData.forms);
const IRREGULAR_PARTICIPLES: ReadonlySet<string> = new Set(irregularParticiplesData.forms);
const AMBIGUOUS_PARTICIPLES: ReadonlySet<string> = new Set(ambiguousParticiplesData.forms);
const NOMINAL_FALSE_POSITIVES: ReadonlySet<string> = new Set(nominalFalsePositivesData.forms);

/** Conectores permitidos entre auxiliar e particípio (e entre particípio e agente). */
const CONNECTOR_ADVERBS = new Set(["não", "já", "ainda", "também", "sempre", "nunca", "apenas", "logo"]);
const RE_MENTE_ADVERB = /^\p{L}+mente$/u;

/** Pontuação capaz de encerrar/dividir a oração — barreira dura, aborta a busca. */
const BARRIER_PUNCTUATION = new Set([",", ";", ":", "!", "?", "…", "(", ")", "[", "]", '"', "'", "—"]);

/** Conjunções cuja presença indica que o particípio seguinte pertence a outra oração. */
const BARRIER_CONJUNCTIONS = new Set(["que", "mas", "e", "porque", "quando"]);

const AGENT_MARKERS = new Set(["pelo", "pela", "pelos", "pelas"]);

/**
 * "pelo menos", "pelo visto", "pelo contrário" — usos idiomáticos e correntes de
 * `pelo/pela` que NÃO introduzem agente. Guarda pequena e fechada: sem ela, esses três
 * idiomas seriam sistematicamente mal-classificados como agente presente (não é um
 * erro raro — são construções frequentíssimas em PT-BR).
 */
const NON_AGENT_IDIOM_HEADS = new Set(["menos", "visto", "contrário"]);

/** Máximo de tokens-conector aceitos entre auxiliar↔particípio e particípio↔agente. */
const MAX_CONNECTOR_TOKENS = 2;

/** Máximo de tokens adicionais absorvidos no span após o marcador de agente. */
const MAX_AGENT_PHRASE_TOKENS = 6;

/**
 * `íd` (í acentuado) cobre particípios de verbos em vogal+ir (construir, incluir,
 * concluir, distribuir, possuir, atribuir, substituir…) — "construído" não "construido":
 * a ortografia exige o acento para marcar o hiato entre a vogal do radical e o "i" do
 * sufixo. Sem essa variante, toda essa classe de verbos ficaria fora do reconhecimento.
 */
const RE_REGULAR_PARTICIPLE_SUFFIX = /^(.{2,}?)(ad|id|íd)[ao]s?$/u;

function isConnector(token: Token): boolean {
  return token.isWord && (CONNECTOR_ADVERBS.has(token.lower) || RE_MENTE_ADVERB.test(token.lower));
}

function isBarrier(token: Token): boolean {
  if (token.isWord) return BARRIER_CONJUNCTIONS.has(token.lower);
  return BARRIER_PUNCTUATION.has(token.text);
}

function isParticipleShape(token: Token): boolean {
  if (!token.isWord) return false;
  if (IRREGULAR_PARTICIPLES.has(token.lower)) return true;
  return RE_REGULAR_PARTICIPLE_SUFFIX.test(token.lower);
}

interface ParticipleSearchResult {
  index: number;
}

/**
 * Varre a partir de `startIndex` procurando um token com formato de particípio,
 * consumindo só conectores explicitamente reconhecidos (orçamento `MAX_CONNECTOR_TOKENS`).
 * Qualquer token não reconhecido, ou barreira, aborta a busca imediatamente — nunca
 * "pula" tokens desconhecidos.
 */
function findParticipleAfter(tokens: readonly Token[], startIndex: number): ParticipleSearchResult | null {
  let i = startIndex;
  let connectorsUsed = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (isParticipleShape(token)) return { index: i };
    if (isBarrier(token)) return null;
    if (isConnector(token) && connectorsUsed < MAX_CONNECTOR_TOKENS) {
      connectorsUsed++;
      i++;
      continue;
    }
    return null;
  }

  return null;
}

interface AgentSearchResult {
  markerIndex: number;
}

/** Mesma mecânica de conector/barreira de `findParticipleAfter`, procurando o agente. */
function findAgentAfter(tokens: readonly Token[], startIndex: number): AgentSearchResult | null {
  let i = startIndex;
  let connectorsUsed = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.isWord && AGENT_MARKERS.has(token.lower)) {
      const next = tokens[i + 1];
      const isIdiom = next?.isWord && NON_AGENT_IDIOM_HEADS.has(next.lower);
      if (!isIdiom) return { markerIndex: i };
      return null;
    }
    if (isBarrier(token)) return null;
    if (isConnector(token) && connectorsUsed < MAX_CONNECTOR_TOKENS) {
      connectorsUsed++;
      i++;
      continue;
    }
    return null;
  }

  return null;
}

/** Estende o fim do span a partir do marcador de agente, até barreira ou o teto de tokens. */
function extendAgentPhraseEnd(tokens: readonly Token[], markerIndex: number): number {
  let end = tokens[markerIndex].end;
  let consumed = 0;
  let j = markerIndex + 1;

  while (j < tokens.length && consumed < MAX_AGENT_PHRASE_TOKENS) {
    const token = tokens[j];
    if (isBarrier(token)) break;
    end = token.end;
    consumed++;
    j++;
  }

  return end;
}

function buildJustification(hasAgent: boolean): string {
  if (hasAgent) {
    return (
      "Frase na voz passiva, com agente explícito — o texto já diz quem praticou a " +
      "ação. Considere reescrever na voz ativa para tornar a frase mais direta; a " +
      "ferramenta não reescreve automaticamente."
    );
  }
  return (
    "Frase na voz passiva, sem agente explícito — não é possível saber, só pelo " +
    "texto, quem praticou a ação. Indique o agente ou reescreva na voz ativa; a " +
    "ferramenta não reescreve automaticamente porque isso exigiria adivinhar quem agiu."
  );
}

export const passiveVoicePass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,
  dataDeps: [
    "verbos-ser.pt",
    "participios-irregulares.pt",
    "participios-ambiguos.pt",
    "participios-falsos-nominais.pt",
  ],

  run(ctx) {
    if (!ctx.config.passiveVoice.enabled) return [];

    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const tokens = sentence.tokens;

      for (let i = 0; i < tokens.length; i++) {
        const anchor = tokens[i];
        if (!(anchor.isWord && SER_FORMS.has(anchor.lower))) continue;

        const participleMatch = findParticipleAfter(tokens, i + 1);
        if (!participleMatch) continue;

        const participle = tokens[participleMatch.index];
        if (AMBIGUOUS_PARTICIPLES.has(participle.lower) || NOMINAL_FALSE_POSITIVES.has(participle.lower)) {
          continue;
        }

        const agentMatch = findAgentAfter(tokens, participleMatch.index + 1);
        const hasAgent = agentMatch !== null;

        const start = anchor.start;
        const end = hasAgent ? extendAgentPhraseEnd(tokens, agentMatch.markerIndex) : participle.end;

        // Proveniência dos PAPÉIS para o andaime do Tier 2 (ADR-013). Offsets já conhecidos
        // aqui — só registrados. `meta` fica fora do snapshot canônico (ver types.ts), então
        // nenhum Diagnostic muda de forma. O andaime (passive-scaffold.ts) lê esses offsets;
        // nunca reconstrói a análise.
        const marker = hasAgent ? tokens[agentMatch.markerIndex] : null;
        const meta: Record<string, string | number | boolean> = {
          hasAgent,
          participleStart: participle.start,
          participleEnd: participle.end,
        };
        if (hasAgent && marker) {
          meta.agentMarkerStart = marker.start;
          meta.agentMarkerEnd = marker.end;
          meta.agentEnd = end;
          // O objeto da ativa é o SUJEITO da passiva — o sintagma antes de "ser". Como só
          // reconhecemos agente na ordem canônica ([sujeito] ser particípio pela agente), o
          // sujeito fica entre o início da frase e a âncora. Região limpa (sem parser), que
          // o andaime devolve rotulada "confira".
          meta.subjectStart = sentence.start;
        }

        findings.push({
          criterion: CRITERION,
          category: "syntactic",
          principle: PRINCIPLE,
          span: { start, end, text: ctx.doc.source.slice(start, end) },
          severity: "warning",
          requiresHuman: !hasAgent,
          justification: buildJustification(hasAgent),
          meta,
        });
      }
    }

    return findings;
  },
};
