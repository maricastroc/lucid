/**
 * Narrativa dos diagnósticos — a copy do RELATÓRIO técnico do inspetor, centralizada e
 * honesta. Tudo é derivado do `Finding` real (span, meta, suggestion) + dos metadados de
 * critério; nada é inventado. A "confiança" NÃO é uma probabilidade: é a explicação
 * determinística de por que a engine assina (ou não) uma sugestão.
 *
 * COMPLETUDE EM COMPILE-TIME (ADR-037): a copy vive num `Record<CriterionId, …>` — como o
 * `CRITERION_META`. Adicionar um critério ao engine QUEBRA o typecheck aqui até a copy dele ser
 * escrita, em vez de cair silenciosamente num fallback errado. `headline`/`prose` são opcionais
 * (o default — `label` do critério / a própria `justification` do finding — é sempre CORRETO);
 * `confidence` é OBRIGATÓRIO por critério (era exatamente o campo cujo fallback dava a explicação
 * de outro critério).
 *
 * `longSentenceGuidance` implementa a orientação assistida (Tier 2, item 1): mede a frase
 * e DELEGA a localização dos pontos de divisão ao core determinístico (`clauseSplitPoints`,
 * ADR-012) — a detecção não é reimplementada aqui. A ferramenta não corta; ela aponta e,
 * quando o autor escolhe, o core insere a quebra. A decisão é do autor.
 */
import { clauseSplitPoints, isCriterionId, type CriterionId, type Finding, type SplitPoint } from "@/lucid";
import { CRITERION_META } from "./criteria";

function metaNum(f: Finding, k: string): number | null {
  const v = f.meta?.[k];
  return typeof v === "number" ? v : null;
}
function metaStr(f: Finding, k: string): string | null {
  const v = f.meta?.[k];
  return typeof v === "string" ? v : null;
}
function metaBool(f: Finding, k: string): boolean {
  return f.meta?.[k] === true;
}
function flat(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

const DOMAIN_PT: Record<string, string> = {
  administrative: "administrativo",
  legal: "jurídico",
  general: "técnico",
};

export type ConfidenceLevel = "segura" | "assistida";
type Confidence = { level: ConfidenceLevel; rationale: string };

/** Atalho para o caso comum: sinal assistido (requiresHuman), sem troca segura. */
function assistida(rationale: string): Confidence {
  return { level: "assistida", rationale };
}

interface CriterionNarrative {
  /** Cabeçalho da nota. Ausente → `CRITERION_META[id].label` (sempre correto). */
  headline?: (f: Finding) => string;
  /** "O que encontramos". Ausente → a própria `f.justification` (escrita pelo pass). */
  prose?: (f: Finding) => string;
  /** Explicação de confiança — OBRIGATÓRIA: cada critério diz POR QUE assina (ou não). */
  confidence: (f: Finding) => Confidence;
}

/**
 * Uma entrada por critério — exaustiva por construção (`Record<CriterionId, …>`). É isto que faz
 * um critério novo FALHAR ALTO no typecheck em vez de herdar a copy de outro.
 */
const NARRATIVE: Record<CriterionId, CriterionNarrative> = {
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Frase longa · ${w} palavras` : "Frase longa";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      const over = w != null && th != null ? w - th : null;
      return `Uma única frase acumula ${w ?? "muitas"} palavras${
        over != null ? ` — ${over} acima do limite de ${th}` : ""
      }. O detector não interpreta o conteúdo: conta as palavras da frase e compara com o limite.`;
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `A ferramenta mede o comprimento com exatidão${
          w != null && th != null ? ` (${w} palavras contra o limiar de ${th})` : ""
        }, mas não decide o que é supérfluo nem onde cortar — isso é trabalho de autor (Princípio 1). O que ela pode fazer é localizar onde a frase pode se dividir; a escolha é sua.`,
      );
    },
  },
  passive_voice: {
    headline: (f) => (metaBool(f, "hasAgent") ? "Voz passiva com agente" : "Voz passiva sem agente"),
    prose: (f) =>
      `«${flat(f.span.text)}» combina uma forma do verbo “ser” com um particípio. ${
        metaBool(f, "hasAgent") ? "O agente aparece no próprio trecho." : "O texto não diz quem praticou a ação."
      }`,
    confidence: (f) =>
      assistida(
        metaBool(f, "hasAgent")
          ? `O agente está no texto, então a informação existe — mas virar para a ativa exige reordenar sujeito e objeto e reconjugar o verbo. Isso está fora da garantia mecânica: a ferramenta monta o andaime, a frase final é sua.`
          : `Além de reordenar e reconjugar, aqui o agente não está no texto: reescrever na ativa exigiria inventar quem praticou a ação. A ferramenta se recusa a fabricar e devolve a decisão a você.`,
      ),
  },
  nominalization: {
    headline: (f) => {
      const base = metaStr(f, "baseVerb");
      return base ? `Nominalização de “${base}”` : "Nominalização";
    },
    prose: (f) => {
      const base = metaStr(f, "baseVerb");
      return `A ação${base ? ` do verbo “${base}”` : ""} aparece disfarçada de substantivo, presa a um verbo-suporte — o que alonga a frase e afasta o verbo do seu sentido.`;
    },
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `O verbo-base substitui a construção diretamente e o complemento está num formato limpo. A forma verbal — infinitivo ou finita — vem de uma tabela fechada verificada à mão, sem conjugador produtivo, preservando tempo e pessoa. Troca 1:1, segura para aplicar.`,
        };
      const base = metaStr(f, "baseVerb");
      return assistida(
        `A construção foi detectada, mas gerar a troca exigiria reconjugar o verbo${
          base ? ` “${base}”` : ""
        } ou o complemento não está num formato que a ferramenta reconheça com segurança. Ela recusa flexionar automaticamente e devolve o verbo-base para você reescrever.`,
      );
    },
  },
  jargon: {
    headline: (f) => `Jargão ${DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico"}`,
    prose: (f) =>
      `«${flat(f.span.text)}» é reconhecido no glossário curado como termo ${
        DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico"
      }, pouco familiar para leitores fora desse domínio.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `“${flat(f.span.text)}” consta no glossário curado com um equivalente único e independente de contexto; trocar por “${f.suggestion}” preserva a regência e não pede reconjugação. É uma substituição 1:1 — por isso a ferramenta assina embaixo.`,
        };
      return assistida(
        `Há um equivalente mais simples, mas a troca depende do que vem depois na frase: aplicá-la às cegas poderia quebrar a concordância. A ferramenta detecta e aponta o caminho, mas deixa a troca com você.`,
      );
    },
  },
  subordinacao_densa: {
    headline: (f) => {
      const c = metaNum(f, "clauses");
      return c != null ? `Subordinação densa · ${c} orações` : "Subordinação densa";
    },
    prose: (f) => {
      const c = metaNum(f, "clauses");
      const th = metaNum(f, "threshold");
      return `Esta frase encadeia ${c ?? "várias"} orações subordinadas${
        th != null ? ` (limiar: ${th})` : ""
      }. O detector conta conectivos subordinativos inequívocos — não interpreta o conteúdo, e ignora de propósito os ambíguos (“que”, “se”, “caso”…).`;
    },
    confidence: (f) => {
      const c = metaNum(f, "clauses");
      return assistida(
        `A ferramenta conta os conectivos subordinativos com exatidão${
          c != null ? ` (${c} nesta frase)` : ""
        }, mas separar as orações exige decidir o que vira frase própria e reconjugar — trabalho de autor (Princípio 1). Ela aponta a densidade; a reescrita é sua.`,
      );
    },
  },
  leitor_terceira_pessoa: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun ? `Fala indireta · “${noun}”` : "Fala indireta ao leitor";
    },
    prose: (f) => {
      const noun = metaStr(f, "readerNoun");
      const verb = metaStr(f, "deonticVerb");
      return `O texto nomeia o leitor em terceira pessoa${noun ? ` (“${noun}”)` : ""}${
        verb ? ` e lhe atribui uma obrigação (“${verb}”)` : ""
      } — fala SOBRE o leitor em vez de falar COM ele. O detector exige sujeito + verbo deôntico, então “tem direitos” (sem obrigação) não marca.`;
    },
    confidence: () =>
      assistida(
        `A ferramenta reconhece o substantivo-leitor em posição de sujeito com um verbo de obrigação — mas trocar para “você” ou imperativo muda a pessoa e o registro do texto, uma decisão de estilo do autor. É um sinal fraco (info): aponta, não corrige.`,
      ),
  },
  salto_de_nivel_titulo: {
    headline: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return l != null && p != null ? `Salto de título · nível ${p}→${l}` : "Salto de nível de título";
    },
    prose: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return `A hierarquia de títulos pula do nível ${p ?? "anterior"} para o ${l ?? "seguinte"}, sem o degrau intermediário. O detector lê os NÍVEIS dos títulos — só existe porque o documento é estruturado (o .docx traz essa marcação; texto puro não tem título de verdade).`;
    },
    confidence: () =>
      assistida(
        `A ferramenta lê os níveis dos títulos com exatidão, mas decidir se este título deve subir de nível ou se falta um título intermediário depende da organização do conteúdo — trabalho de autor.`,
      ),
  },
  mais_que_perfeito_sintetico: {
    confidence: () =>
      assistida(
        `A forma está correta, mas o mais-que-perfeito sintético (“fizera”) soa arcaico e trava o leitor. A forma composta (“tinha feito”) é mais clara — trocar exige reconjugar com o auxiliar, o que a ferramenta não faz sozinha.`,
      ),
  },
  gerundismo: {
    confidence: () =>
      assistida(
        `O gerúndio encadeado (“vamos estar enviando”) alonga sem informar. O futuro simples ou o presente (“enviaremos”, “enviamos”) diz o mesmo em menos palavras — mas reescrever muda a forma verbal, decisão sua.`,
      ),
  },
  adverbio_mente_denso: {
    confidence: () =>
      assistida(
        `A ferramenta conta os advérbios em -mente da frase com exatidão, mas decidir quais cortar ou substituir depende do que você quer enfatizar — trabalho de autor.`,
      ),
  },
  redundancia: {
    confidence: () =>
      assistida(
        `A ferramenta reconhece a dupla redundante, mas escolher qual termo cortar é decisão sua — por isso aponta a forma enxuta na justificativa em vez de aplicar.`,
      ),
  },
  perifrase_inflada: {
    confidence: () =>
      assistida(
        `A perífrase tem uma forma enxuta equivalente, mas trocá-la pode mudar a regência do que vem depois — a ferramenta aponta a forma direta e deixa a troca com você.`,
      ),
  },
  paragraph_length: {
    confidence: () =>
      assistida(
        `A ferramenta conta as frases do parágrafo com exatidão, mas onde cortá-lo em blocos menores depende da organização das ideias — decisão de autor.`,
      ),
  },
  prose_enumeration: {
    confidence: () =>
      assistida(
        `A ferramenta reconhece a enumeração embutida na prosa, mas transformá-la em lista é uma decisão de formatação que muda a estrutura do texto — sua.`,
      ),
  },
  mesoclise: {
    confidence: () =>
      assistida(
        `A mesóclise (“far-se-á”) está correta, mas é rara e trava a leitura. Reescrever sem ela (“será feito”, “vai fazer”) muda a construção — trabalho de autor, não troca mecânica.`,
      ),
  },
  dupla_negacao: {
    confidence: () =>
      assistida(
        `A ferramenta reconhece a litotes (“não é incomum”), mas afirmar direto (“é comum”) pode mudar a nuance que você quis dar — por isso aponta a forma direta e deixa a decisão com você.`,
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Título longo · ${w} palavras` : "Título longo";
    },
    confidence: () =>
      assistida(
        `A ferramenta mede o título (palavras, número de frases, pontuação final) com exatidão, mas encurtá-lo ou reformulá-lo como um rótulo depende do que é essencial para o leitor — trabalho de autor.`,
      ),
  },
  single_item_list: {
    confidence: () =>
      assistida(
        `A ferramenta reconhece a lista de um item só, mas decidir entre completar a lista ou dissolvê-la no texto corrido depende do conteúdo — decisão de autor.`,
      ),
  },
  heading_body_mismatch: {
    headline: () => "Título sem eco no corpo",
    prose: (f) => {
      const hw = metaNum(f, "headingContentWords");
      const bw = metaNum(f, "bodyContentWords");
      return (
        `Nenhuma palavra de conteúdo deste título reaparece nas ${bw ?? "várias"} palavras de conteúdo da seção ` +
        `(o título tem ${hw ?? "poucas"}). A comparação é exata — sem lemas —, então plural/singular do mesmo termo ` +
        "não conta como eco; é um proxy fraco de relevância, não uma prova de que o título está errado."
      );
    },
    confidence: () =>
      assistida(
        `Este é o sinal mais fraco da ferramenta: um proxy determinístico (sobreposição de palavras), não uma leitura de sentido. Decidir se o título precisa mudar — e para quê — é trabalho de autor; a ferramenta não reescreve títulos.`,
      ),
  },
};

export function detectionHeadline(f: Finding): string {
  const c = f.criterion;
  if (!isCriterionId(c)) return c;
  return NARRATIVE[c].headline?.(f) ?? CRITERION_META[c].label;
}

export function detectedProse(f: Finding): string {
  const c = f.criterion;
  if (!isCriterionId(c)) return f.justification;
  return NARRATIVE[c].prose?.(f) ?? f.justification;
}

export function buildConfidence(f: Finding): Confidence {
  const c = f.criterion;
  if (!isCriterionId(c)) return assistida(f.justification);
  return NARRATIVE[c].confidence(f);
}

/* ------------------------------------------------- orientação (Tier 2, item 1) --- */

export interface LongSentenceGuidance {
  words: number | null;
  threshold: number | null;
  over: number | null;
  subordination: number;
  targetSentences: number | null;
  /** pontos de divisão candidatos — vêm do core determinístico (`clauseSplitPoints`). */
  candidates: SplitPoint[];
}

const SUBORD_RE = /\b(que|quando|porque|embora|cuj[ao]s?|onde|caso|conforme|porquanto|ainda que|de modo que)\b/gi;

/**
 * `source` é o texto normalizado do diagnóstico (`Diagnostic.text`) — necessário para que
 * os offsets dos pontos de divisão sejam absolutos no documento e sirvam direto ao
 * `applySplitAt`. A subordinação (medida de esforço, só exibição) continua sendo uma
 * contagem simples sobre o span.
 */
export function longSentenceGuidance(f: Finding, source: string): LongSentenceGuidance {
  const span = f.span.text;
  const words = metaNum(f, "words");
  const threshold = metaNum(f, "threshold");
  const over = words != null && threshold != null ? words - threshold : null;
  const targetSentences = words != null && threshold != null ? Math.ceil(words / threshold) : null;

  const commas = (span.match(/,/g) ?? []).length;
  const subs = (span.match(SUBORD_RE) ?? []).length;
  const subordination = commas + subs;

  const candidates = clauseSplitPoints(source, f.span);
  return { words, threshold, over, subordination, targetSentences, candidates };
}
