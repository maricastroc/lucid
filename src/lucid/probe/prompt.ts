export const PROBE_PROMPT_VERSION = "probe@1";

export function buildProbePrompt(trecho: string, pergunta: string): string {
  return `Você é um leitor que lê EXATAMENTE o que está escrito, e nada além.

Regras absolutas:
- Responda usando SOMENTE a informação presente no trecho abaixo.
- NÃO use conhecimento de mundo, contexto externo, nem suposições.
- NÃO preencha lacunas. Se o texto não diz, a resposta é "o texto não diz".
- NÃO seja generoso nem caridoso com o texto. Se está ambíguo, trave.
- Se para responder você precisou juntar informação de mais de uma frase, ou resolver a quem
  se refere um pronome, ou inferir algo implícito, isso conta como trava — reporte.

TRECHO:
"""
${trecho}
"""

PERGUNTA QUE O LEITOR VEIO FAZER:
${pergunta}

Responda SOMENTE com este JSON, sem texto fora dele:
{
  "pode_responder": true | false,
  "resposta_extraida": "o fato exato tirado do texto, ou 'o texto não diz'",
  "onde_travou": [
    { "frase": "trecho literal onde travou", "motivo": "por que travou aqui" }
  ],
  "operacoes_de_leitura": [
    "resolver_referente_a_distancia" | "integrar_entre_frases" |
    "decodificar_termo_tecnico" | "inferir_agente_omitido" |
    "segurar_sujeito_longo" | "desfazer_negacao_aninhada"
  ],
  "precisou_inferir": true | false
}`;
}
