/**
 * Golden da META-EVAL da sonda de compreensão (Camada 2) — CLAUDE.md, seção "Disciplina de eval":
 * "a sonda tem que travar onde os humanos travaram. Medir concordância com os rótulos."
 *
 * Cada entrada é um trecho + a PERGUNTA que o leitor veio fazer + o RÓTULO HUMANO `humanoTrava`.
 * O rótulo é definido EXATAMENTE pelo que o piso da sonda mede (ver `interpret`): o leitor de baixa
 * literacia consegue extrair o fato pedido USANDO SÓ O TEXTO, sem inferir? — `humanoTrava = false`
 * (deve virar `neutro`) — ou não consegue / precisa preencher lacuna? — `humanoTrava = true` (deve
 * virar `flag`).
 *
 * FRONTEIRA IMPORTANTE (honestidade): o piso da sonda é EXTRAÇÃO, não COMPREENSÃO. Um trecho pode
 * ser pesado de ler (termo técnico, sujeito longo, coesão entre frases) e ainda assim ter o fato
 * LITERALMENTE extraível — esse caso é `humanoTrava = false` e carrega uma `operacaoLeitura` no eixo
 * de CARGA (sinal, não piso). Confundir carga com travamento penalizaria a sonda por algo fora do
 * seu contrato. Por isso os dois eixos são medidos separadamente.
 *
 * Cada entrada é justificada individualmente (`porque`) — nunca "decorar o golden". Fonte dos
 * exemplos: construções típicas de texto administrativo/jurídico brasileiro.
 */
import type { OperacaoLeitura, ProbeResult } from "../../src/lucid/probe/types";

/** Por que o leitor de piso trava, quando trava — o modo de falha que `interpret` reconhece. */
export type ModoDeFalha = "nao_extrai" | "precisa_inferir";

export interface ProbeGoldenCase {
  id: string;
  trecho: string;
  /** a pergunta que o leitor veio fazer */
  pergunta: string;
  /** rótulo humano: o leitor de piso NÃO extrai o fato só do texto → deve virar `flag` */
  humanoTrava: boolean;
  /** presente só quando `humanoTrava` — como o piso falha (alimenta o oráculo determinístico) */
  modoDeFalha?: ModoDeFalha;
  /** eixo de CARGA (sinal): operação de leitura que o trecho exige, mesmo quando extraível */
  operacaoLeitura?: OperacaoLeitura;
  /** família do caso, para o relatório por categoria */
  categoria:
    | "claro"
    | "agente_omitido"
    | "referente_ambiguo"
    | "negacao_aninhada"
    | "fato_ausente"
    | "inferencia_exigida"
    | "carga_extraivel";
  /** justificativa individual da rotulagem */
  porque: string;
}

export const GOLDEN_SONDA: readonly ProbeGoldenCase[] = [
  // ---- CLARO: fato literal e direto → deve virar `neutro` --------------------------------------
  {
    id: "claro-prazo",
    trecho: "O prazo para recorrer é de dez dias. Ele começa a contar da data da publicação.",
    pergunta: "Qual é o prazo para recorrer?",
    humanoTrava: false,
    categoria: "claro",
    porque: "A resposta ('dez dias') está literal na primeira frase, sem pronome ambíguo nem lacuna — extração direta.",
  },
  {
    id: "claro-contagem",
    trecho: "Traga três documentos: a identidade, o CPF e um comprovante de residência.",
    pergunta: "Quantos documentos preciso trazer?",
    humanoTrava: false,
    categoria: "claro",
    porque: "O número ('três') está dito e a lista o confirma; nenhuma integração ou inferência é necessária.",
  },
  {
    id: "claro-instrucao",
    trecho: "Para renovar a carteira, acesse o site do órgão e clique no botão Renovar.",
    pergunta: "O que fazer para renovar a carteira?",
    humanoTrava: false,
    categoria: "claro",
    porque: "A instrução é uma sequência explícita de ações no próprio trecho — extraível sem preencher nada.",
  },

  // ---- CARGA extraível: pesado de ler, MAS o fato está literal → `neutro` + operação de carga ----
  {
    id: "carga-termo-tecnico",
    trecho: "A guia só é aceita com a autenticação mecânica do DARF impressa no verso.",
    pergunta: "O que precisa estar no verso da guia?",
    humanoTrava: false,
    operacaoLeitura: "decodificar_termo_tecnico",
    categoria: "carga_extraivel",
    porque:
      "O leitor COPIA a resposta literal ('a autenticação mecânica do DARF') mesmo sem entender o termo — o piso é extração, e ela ocorre; a dificuldade de decodificar é carga (sinal), não travamento.",
  },
  {
    id: "carga-sujeito-longo",
    trecho:
      "A comissão responsável pela análise dos pedidos protocolados pelos candidatos no último edital decidirá na sexta-feira.",
    pergunta: "Quem vai decidir na sexta-feira?",
    humanoTrava: false,
    operacaoLeitura: "segurar_sujeito_longo",
    categoria: "carga_extraivel",
    porque:
      "O sujeito ('a comissão…') é longo mas contínuo e sem ambiguidade; a resposta é extraível segurando o sujeito até o verbo — carga estrutural, não falha de piso.",
  },
  {
    id: "carga-integracao",
    trecho: "O pagamento é feito todo dia 5. Nesse dia, o valor cai direto na conta do beneficiário.",
    pergunta: "O que acontece no dia 5?",
    humanoTrava: false,
    operacaoLeitura: "integrar_entre_frases",
    categoria: "carga_extraivel",
    porque:
      "Responder exige ligar 'nesse dia' a 'dia 5' entre duas frases — coesão explícita, resolúvel; o fato sai do texto sem inferência externa.",
  },

  // ---- TRAVA: o leitor de piso NÃO extrai o fato só do texto → deve virar `flag` ----------------
  {
    id: "agente-omitido",
    trecho: "O pedido foi indeferido por falta de documentos.",
    pergunta: "Quem indeferiu o pedido?",
    humanoTrava: true,
    modoDeFalha: "nao_extrai",
    operacaoLeitura: "inferir_agente_omitido",
    categoria: "agente_omitido",
    porque: "A passiva sem agente não diz QUEM indeferiu; o texto não contém a resposta — 'o texto não diz'.",
  },
  {
    id: "referente-ambiguo",
    trecho: "O requerente entregou o formulário ao servidor. Ele estava incompleto.",
    pergunta: "O que estava incompleto?",
    humanoTrava: true,
    modoDeFalha: "nao_extrai",
    operacaoLeitura: "resolver_referente_a_distancia",
    categoria: "referente_ambiguo",
    porque:
      "'Ele' pode ser o formulário OU o servidor; o texto não desambigua, então o leitor de piso não pode responder sem adivinhar.",
  },
  {
    id: "negacao-aninhada",
    trecho: "Não é incomum que o prazo não seja prorrogado.",
    pergunta: "O prazo costuma ser prorrogado?",
    humanoTrava: true,
    modoDeFalha: "nao_extrai",
    operacaoLeitura: "desfazer_negacao_aninhada",
    categoria: "negacao_aninhada",
    porque:
      "Duas negações aninhadas ('não é incomum… não seja') invertem o sentido; o leitor de piso trava para desmontar a dupla negação e a resposta fica ambígua.",
  },
  {
    id: "fato-ausente",
    trecho: "O benefício será pago conforme o calendário oficial de pagamentos.",
    pergunta: "Em que dia o benefício será pago?",
    humanoTrava: true,
    modoDeFalha: "nao_extrai",
    categoria: "fato_ausente",
    porque: "O trecho remete a um calendário externo sem trazer a data; o fato pedido não está no texto.",
  },
  {
    id: "casos-nao-enumerados",
    trecho: "A multa será aplicada nos casos previstos em lei.",
    pergunta: "Em quais casos a multa é aplicada?",
    humanoTrava: true,
    modoDeFalha: "nao_extrai",
    categoria: "fato_ausente",
    porque: "'Nos casos previstos em lei' aponta para fora do trecho sem enumerá-los; a resposta não está presente.",
  },
  {
    id: "inferencia-validade",
    trecho: "O comprovante emitido tem validade de seis meses a partir da emissão.",
    pergunta: "Meu comprovante ainda é válido?",
    humanoTrava: true,
    modoDeFalha: "precisa_inferir",
    categoria: "inferencia_exigida",
    porque:
      "Responder exige inferir com data de emissão e data de hoje — informação fora do trecho; sem preencher lacuna, o piso não decide.",
  },
];

/**
 * ORÁCULO determinístico: o `ProbeResult` que um leitor de piso PERFEITO produziria para cada caso,
 * derivado só do rótulo humano. Usado na camada CI (sem rede) para provar o harness de concordância
 * e a ponte rótulo→`interpret` — NÃO é a sonda real (essa é medida na camada ao vivo).
 */
export function oracleResult(c: ProbeGoldenCase): ProbeResult {
  const operacoes = c.operacaoLeitura ? [c.operacaoLeitura] : [];
  if (!c.humanoTrava) {
    return { podeResponder: true, respostaExtraida: "(fato extraído)", ondeTravou: [], operacoesDeLeitura: operacoes, precisouInferir: false };
  }
  if (c.modoDeFalha === "precisa_inferir") {
    return { podeResponder: true, respostaExtraida: "(exige inferência)", ondeTravou: [], operacoesDeLeitura: operacoes, precisouInferir: true };
  }
  return { podeResponder: false, respostaExtraida: "o texto não diz", ondeTravou: [{ frase: c.trecho, motivo: "o texto não diz" }], operacoesDeLeitura: operacoes, precisouInferir: false };
}

/** Fixtures (trecho → oráculo) para semear a `StubComprehensionProbe` na camada CI. */
export function oracleFixtures(): Record<string, ProbeResult> {
  const out: Record<string, ProbeResult> = {};
  for (const c of GOLDEN_SONDA) out[c.trecho] = oracleResult(c);
  return out;
}
