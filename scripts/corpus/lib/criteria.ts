import type { CriterionId } from "./types";

export interface CriterionSpec {
  id: CriterionId;
  label: string;
  promptVersion: string;
  definition: string;
  cue: (text: string) => boolean;
  cueRationale: string;
}

const RE_ACRONYM_SHAPE = /(?<!\p{L})\p{Lu}{2,6}(?!\p{L})/u;

const RE_ENUM_MARKER = /(?:(?<!\p{L})(?:\d{1,2}|i{1,3}|iv|vi{0,3}|ix|x)\s*\)|(?<!\p{L})(?:primeiro|segundo|terceiro|quarto|quinto|primeira|segunda|terceira|quarta|quinta)(?!\p{L}))/giu;

const RE_PERIPHRASIS_SHAPE =
  /(?<!\p{L})(?:em|no|na|nos|nas|com|de|do|da|dos|das|por|para|ao|à|a)\s+\p{L}{3,14}\s+(?:de|do|da|dos|das|a|ao|à|as|às|para|com|que)(?!\p{L})/iu;

export const CRITERIA: readonly CriterionSpec[] = [
  {
    id: "sigla_sem_expansao",
    label: "Sigla sem expansão",
    promptVersion: "sigla@1",
    definition: [
      "Uma SIGLA usada no trecho sem que o nome por extenso apareça no próprio trecho.",
      "",
      "Sigla = sequência de 2 a 6 letras maiúsculas que abrevia o nome de um órgão, programa,",
      "documento, sistema ou entidade.",
      "",
      "MARQUE a sigla quando o leitor não consegue descobrir, lendo só este trecho, o que ela significa.",
      "",
      "NÃO marque:",
      "- numeral romano (I, II, IV, XIV), inclusive em numeração de artigo, inciso ou anexo;",
      "- sigla cujo nome por extenso aparece no próprio trecho, antes ou depois, entre parênteses ou não;",
      "- unidade de medida;",
      "- palavra inteira em maiúscula que não é sigla (título de seção, ênfase, nome próprio grafado em caixa alta);",
      "- sigla que o público leigo brasileiro reconhece sem nenhuma explicação, do tipo que aparece em",
      "  documento pessoal ou no dia a dia. Use seu julgamento: a pergunta é se uma pessoa sem formação",
      "  jurídica ou administrativa saberia o que é.",
    ].join("\n"),
    cue: (text) => RE_ACRONYM_SHAPE.test(text),
    cueRationale:
      "qualquer token de 2 a 6 maiúsculas. Mais larga que o detector: sem filtro de numeral romano, sem a regra de soldado-a-dígito e SEM a lista de exclusão de siglas conhecidas.",
  },
  {
    id: "prose_enumeration",
    label: "Enumeração em prosa",
    promptVersion: "enum@1",
    definition: [
      "Uma ENUMERAÇÃO DE ITENS escrita dentro do parágrafo, em prosa corrida, que ficaria mais",
      "legível como lista vertical.",
      "",
      "Caracteriza-se por dois ou mais itens em sequência marcados por numeral, algarismo romano",
      'ou ordinal por extenso — do tipo "1) ... 2) ...", "i) ... ii) ...", "primeiro ... segundo ...".',
      "",
      "MARQUE uma única ocorrência por enumeração, no ponto onde ela começa (o primeiro marcador).",
      "",
      "NÃO marque:",
      "- um marcador isolado, sem um segundo item em sequência;",
      "- lista que já está formatada em linhas separadas;",
      "- a numeração estrutural do próprio ato (artigo, parágrafo, inciso, alínea, anexo), que é a",
      "  espinha do documento e não uma enumeração embutida na frase;",
      "- referência a números que não enumeram itens (datas, valores, prazos, citação de dispositivo).",
    ].join("\n"),
    cue: (text) => {
      const matches = text.match(RE_ENUM_MARKER);
      return matches !== null && matches.length >= 2;
    },
    cueRationale:
      "dois ou mais marcadores ordinais/numéricos no trecho. Mais larga que o detector: não exige que a sequência seja bem-formada nem crescente, e não distingue numeração estrutural do ato.",
  },
  {
    id: "perifrase_inflada",
    label: "Perífrase inflada",
    promptVersion: "perifrase@1",
    definition: [
      "Uma PERÍFRASE INFLADA: uma locução de várias palavras ocupando o lugar de uma preposição,",
      "conjunção ou verbo simples, sem acrescentar sentido.",
      "",
      'O teste é a troca: se a locução inteira pode ser substituída por UMA palavra simples sem',
      "mudar o que a frase afirma, ela é inflada.",
      "",
      "MARQUE a locução inteira, exatamente como aparece no texto.",
      "",
      "NÃO marque:",
      "- locução que carrega sentido próprio e não tem equivalente de uma palavra;",
      "- termo técnico ou expressão consagrada cujo encurtamento mudaria o efeito jurídico;",
      "- locução que já é a forma mais curta disponível;",
      "- nome de órgão, programa ou documento que por acaso tenha forma de locução.",
      "",
      "Para cada ocorrência, informe também a palavra simples que a substituiria.",
    ].join("\n"),
    cue: (text) => RE_PERIPHRASIS_SHAPE.test(text),
    cueRationale:
      "preposição + palavra curta + preposição. Derivada da FORMA SINTÁTICA, não das entradas do léxico: pega muita locução legítima junto, e isso é desejado — quem decide é o rotulador.",
  },
];

export function criterionById(id: string): CriterionSpec {
  const found = CRITERIA.find((c) => c.id === id);
  if (!found) throw new Error(`critério desconhecido: ${id}`);
  return found;
}

export function cuedCriteria(text: string): CriterionId[] {
  return CRITERIA.filter((c) => c.cue(text)).map((c) => c.id);
}
