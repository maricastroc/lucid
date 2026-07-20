/**
 * Contagem silábica determinística em PT-BR (docs/ARQUITETURA.md §6.5, §9 Fase 1).
 *
 * Heurística de CONTAGEM DE GRUPOS VOCÁLICOS — sem dicionário de sílabas, sem modelo de
 * tonicidade. Cada grupo máximo de vogais consecutivas conta como 1 sílaba por padrão
 * (trata como ditongo/tritongo), exceto quando um sinal ortográfico LOCAL indica hiato,
 * verificado nesta ordem de prioridade (auditoria completa em docs/DECISOES.md, ADR-004):
 *
 *   1. `ão` / `ãe` / `õe` — ditongo nasal grudado, NUNCA hiato (checado antes de tudo,
 *      porque tecnicamente cairia na regra 3 abaixo se não fosse essa exceção).
 *   2. `í`/`ú` acentuados logo após outra vogal — hiato explícito por marca gráfica
 *      (saída, saúde, país, egoísmo). A própria ortografia exige o acento aqui
 *      justamente para marcar o hiato — sinal 100% determinístico.
 *   3. `i`/`u` átono (sem acento) imediatamente seguido do dígrafo `nh` — hiato sem
 *      marca gráfica, mas por regra ortográfica conhecida: é por causa do `nh` que a
 *      norma dispensa o acento em "rainha", "bainha", "moinho", "campainha".
 *   4. duas vogais "fortes" (a/e/o, acentuadas ou não — exceto í/ú, já cobertas acima)
 *      adjacentes — hiato. Em português, só `i`/`u` podem funcionar como semivogal;
 *      duas vogais plenas nunca compartilham núcleo silábico (poesia, teatro, oceano,
 *      real, aéreo).
 *   5. vogal idêntica à anterior — hiato (voo, coordenar).
 *   6. caso contrário — cola no mesmo grupo (ditongo/tritongo por padrão: história,
 *      água, quando, pai, causa...).
 *
 * LIMITAÇÕES CONHECIDAS (aceitas, documentadas, não corrigidas aqui — exigiriam
 * predição de tonicidade ou dicionário, fora do escopo zero-dep desta etapa, mesmo
 * espírito de ADR-001 em docs/DECISOES.md):
 *   - Hiato "final átono" que depende de qual sílaba é a tônica da palavra não é
 *     recuperável da grafia: "história" (ditongo "ria", tônica em "tó") e "poesia"
 *     (a última sílaba é tônica, então "i" fica isolado) têm o MESMO padrão gráfico
 *     "vogal fraca átona + vogal forte final" com resultados opostos. A regra 4 acima
 *     resolve o "o-e" de "poesia" (2→3), mas o par final "i-a" continua fundido —
 *     "poesia" fica em 3, não 4. Mesmo padrão em "alegria", "reunião"/"união"
 *     (hiato de fronteira de prefixo/morfema, não recuperável localmente).
 *   - Siglas com pelo menos uma vogal, mas convencionalmente soletradas na fala (ex.:
 *     "INSS", lida "êne-esse-esse" apesar do "I" inicial) vs. siglas lidas como palavra
 *     ("ONU", "PIB") — indistinguíveis pela grafia; é convenção de uso, não ortografia.
 *
 * Hífen, apóstrofo e ponto interno de sigla (produzidos pelo tokenizador — ver
 * `tokenize.ts`) são tratados de forma unificada: o texto do token é dividido em
 * segmentos de letras puras nesses caracteres, e cada segmento é contado
 * independentemente, depois somado. Isso cobre palavras hifenizadas ("guarda-chuva"),
 * elisão por apóstrofo ("d'água") e siglas grudadas ("E.U.A") sem lógica especial por
 * caso.
 */

const VOGAIS = new Set(["a", "e", "i", "o", "u", "á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "y"]);

/** Vogais cuja marca gráfica de acento indica hiato explícito quando seguem outra vogal. */
const VOGAIS_QUE_FORCAM_HIATO = new Set(["í", "ú"]);

/** Vogais "fortes" — nunca funcionam como semivogal/glide em português. */
const VOGAIS_FORTES = new Set(["a", "á", "à", "â", "ã", "e", "é", "ê", "o", "ó", "ô", "õ"]);

/** Ditongos nasais grudados — nunca hiato, mesmo sendo tecnicamente "duas vogais fortes". */
const PARES_NASAIS_GRUDADOS = new Set(["ão", "ãe", "õe"]);

const RE_NAO_LETRA = /[^\p{L}]+/u;

/** Sequência inteira de letras maiúsculas (usada para detectar sigla soletrada). */
const RE_TUDO_MAIUSCULO = /^\p{Lu}+$/u;

/**
 * Pequeno léxico de exceções pedagogicamente documentadas: hiato entre vogal fraca
 * (i/u) e vogal adjacente SEM marca gráfica de acento, que a regra ortográfica padrão
 * (fraca+forte não-acentuada = ditongo) classificaria erradamente como ditongo. São os
 * exemplos clássicos citados em gramáticas de português para este fenômeno — mantidos
 * aqui por não haver regra ortográfica local que os distinga de casos como
 * "história"/"água", onde o mesmo padrão de letras É, de fato, ditongo. Ver auditoria em
 * docs/DECISOES.md (ADR-004) para a lista completa de ambiguidades aceitas sem léxico.
 * Deliberadamente pequeno: não é para crescer em uma lista arbitrária de exceções.
 */
const EXCECOES_HIATO_SEM_ACENTO: ReadonlyMap<string, number> = new Map([
  ["ruim", 2],
  ["ruins", 2],
  ["cruel", 2],
  ["cruéis", 2],
]);

function contarSilabasSegmento(segmentoOriginal: string): number {
  const segmento = segmentoOriginal.toLowerCase();

  const excecao = EXCECOES_HIATO_SEM_ACENTO.get(segmento);
  if (excecao !== undefined) return excecao;

  let silabas = 0;
  let emGrupoVocalico = false;
  let vogalAnterior: string | null = null;

  for (let i = 0; i < segmento.length; i++) {
    const caractere = segmento[i];

    if (!VOGAIS.has(caractere)) {
      emGrupoVocalico = false;
      vogalAnterior = null;
      continue;
    }

    let iniciaNovoGrupo: boolean;

    if (!emGrupoVocalico || vogalAnterior === null) {
      iniciaNovoGrupo = true;
    } else if (PARES_NASAIS_GRUDADOS.has(vogalAnterior + caractere)) {
      iniciaNovoGrupo = false;
    } else if (VOGAIS_QUE_FORCAM_HIATO.has(caractere)) {
      iniciaNovoGrupo = true;
    } else if ((caractere === "i" || caractere === "u") && segmento[i + 1] === "n" && segmento[i + 2] === "h") {
      iniciaNovoGrupo = true;
    } else if (VOGAIS_FORTES.has(vogalAnterior) && VOGAIS_FORTES.has(caractere)) {
      iniciaNovoGrupo = true;
    } else if (caractere === vogalAnterior) {
      iniciaNovoGrupo = true;
    } else {
      iniciaNovoGrupo = false;
    }

    if (iniciaNovoGrupo) silabas++;
    emGrupoVocalico = true;
    vogalAnterior = caractere;
  }

  return silabas;
}

/**
 * Conta sílabas do texto de um token `isWord: true`. Nunca chamar com tokens
 * `isWord: false` (número/pontuação/URL/e-mail) — o resultado não tem sentido para eles.
 */
export function countSyllables(tokenText: string): number {
  if (tokenText.length === 0) return 0;

  // Sigla "soletrada": sequência só de letras maiúsculas, sem NENHUMA vogal — não dá
  // pra pronunciar como palavra (CPF, FGTS, RG), então conta-se 1 unidade por letra
  // (leitura letra a letra). Siglas com pelo menos uma vogal (ONU, PIB) seguem o
  // caminho normal abaixo — ver limitação conhecida sobre siglas ambíguas (ex.: INSS)
  // no comentário de topo deste arquivo.
  if (RE_TUDO_MAIUSCULO.test(tokenText)) {
    const temVogal = Array.from(tokenText.toLowerCase()).some((c) => VOGAIS.has(c));
    if (!temVogal) return tokenText.length;
  }

  const segmentos = tokenText.split(RE_NAO_LETRA).filter((s) => s.length > 0);
  const total = segmentos.reduce((soma, segmento) => soma + contarSilabasSegmento(segmento), 0);

  // Piso de 1 sílaba quando o token inteiro não tem nenhum grupo vocálico (ex.: o
  // fragmento consonantal "d" de "d'água" isolado, ou uma palavra totalmente
  // consonantal rara) — evita que um token não-vazio contribua 0 para a média.
  return total > 0 ? total : 1;
}
