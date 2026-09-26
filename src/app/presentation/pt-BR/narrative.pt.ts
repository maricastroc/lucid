import { assistida, flat, metaBool, metaNum, metaStr, type PtNarrativeSet } from "../../lib/narrative-types";

const DOMAIN_PT: Record<string, string> = {
  administrative: "administrativo",
  legal: "jurídico",
  general: "técnico",
};

const BASE: PtNarrativeSet = {
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Frase com ${w} palavras` : "Comprimento de frase";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "Esta frase tem mais palavras do que o parâmetro de inspeção do Lucid.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      const parameter =
        metaStr(f, "thresholdStatus") === "provisional"
          ? "Esse número é provisório neste idioma de análise, ainda sem validação, e não é um limite da norma"
          : "Esse número é um parâmetro do Lucid, não um limite da norma";
      return (
        `Esta frase tem ${w} palavras, e o Lucid inspeciona frases acima de ${th}. ${parameter}: ` +
        `a ${standard} pede frases concisas e variação de tamanho, sem estabelecer contagem. O que importa é se ` +
        "a frase carrega mais de uma ideia: com uma só, ela pode estar adequada e não precisa ser dividida."
      );
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `A contagem de palavras é exata${w != null && th != null ? ` (${w}, acima de ${th})` : ""}. O ` +
          "comprimento sozinho, porém, não mostra se a frase tem uma ideia longa ou várias ideias empilhadas: " +
          "nomes de órgãos, referências legais e valores por extenso alongam a frase sem acrescentar ideias.",
      );
    },
  },
  passive_voice: {
    headline: (f) =>
      metaStr(f, "eventiveness") === "postposed_subject"
        ? "Voz passiva com sujeito posposto"
        : metaBool(f, "hasAgent")
          ? "Voz passiva com agente"
          : "Voz passiva sem agente",
    prose: (f) => {
      const trecho = `«${flat(f.span.text)}» combina uma forma do verbo “ser” com um particípio.`;
      if (metaStr(f, "eventiveness") === "postposed_subject") {
        return `${trecho} A oração começa no verbo e o sujeito vem depois do particípio, ordem que só a voz passiva admite. O Lucid não encontrou na frase quem pratica a ação.`;
      }
      return `${trecho} ${
        metaBool(f, "hasAgent")
          ? "O agente, quem pratica a ação, aparece no próprio trecho."
          : "O Lucid não encontrou na frase quem praticou a ação."
      }`;
    },
    confidence: (f) =>
      assistida(
        metaStr(f, "eventiveness") === "postposed_subject"
          ? "A ordem verbo-sujeito confirma a voz passiva. O Lucid não inventa um agente que não está no texto."
          : metaBool(f, "hasAgent")
            ? "A voz passiva e o agente foram reconhecidos no texto. Confira se o agente está completo e se a versão na voz ativa mantém o mesmo sentido."
            : "A construção com “ser” + particípio foi localizada. O Lucid não inventa um agente que não está no texto.",
      ),
  },
  passiva_sintetica: {
    headline: () => "Voz passiva sintética (“se”)",
    prose: (f) =>
      metaStr(f, "position") === "proclitic"
        ? `Em «${flat(f.span.text)}», o “se” vem antes do verbo e o texto não diz quem pratica a ação (em “não se aplica a multa”, quem aplica?). O Lucid só aponta esse “se” depois de uma palavra que obriga essa posição (aqui, “${metaStr(f, "attractor") ?? "não"}”), onde ele não pode ser o “se” condicional.`
        : `Em «${flat(f.span.text)}», o “se” vem depois do verbo e o texto não diz quem pratica a ação (em “aplica-se a multa”, quem aplica?).`,
    confidence: () =>
      assistida(
        "A construção foi localizada com segurança, mas o papel do “se” depende da frase: pode ser voz passiva, sujeito indeterminado ou reflexivo. Leia a frase e decida qual é o caso.",
      ),
  },
  nominalization: {
    headline: (f) => {
      const base = metaStr(f, "baseVerb");
      return base ? `Nominalização de “${base}”` : "Nominalização";
    },
    prose: (f) => {
      const base = metaStr(f, "baseVerb");
      const light = metaStr(f, "lightVerb");
      return `A ação${base ? ` de “${base}”` : ""} aparece como substantivo, apoiada ${
        light ? `no verbo “${light}”` : "num verbo como “fazer” ou “realizar”"
      }. Isso alonga a frase e esconde a ação.`;
    },
    confidence: (f) => {
      const base = metaStr(f, "baseVerb");
      if (!f.requiresHuman)
        return assistida(
          `Pela lista curada do Lucid, este substantivo corresponde a um único verbo${base ? `, “${base}”` : ""}. A frase nova pode ser sua ou uma proposta da IA; nos dois casos, o Lucid verifica o resultado.`,
        );
      return assistida(
        `A construção foi reconhecida com segurança, mas este substantivo pode corresponder a mais de um verbo. Confira qual verbo expressa a ação nesta frase${base ? ` (talvez “${base}”)` : ""}.`,
      );
    },
  },
  jargon: {
    headline: (f) => `Jargão ${DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico"}`,
    prose: (f) =>
      `«${flat(f.span.text)}» está no glossário do Lucid como termo ${
        DOMAIN_PT[metaStr(f, "domain") ?? ""] ?? "técnico"
      }, pouco familiar a quem não é da área.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `O glossário do Lucid registra “${f.suggestion}” como equivalente de “${flat(f.span.text)}”, sem outro sentido conhecido e sem mudança de regência. Se ele serve nesta frase, quem confere é você, antes de clicar.`,
        };
      return assistida(
        "O termo foi reconhecido com segurança, mas o glossário não registra uma troca que sirva em qualquer frase: o sentido aqui e o que vem depois decidem. Confira o contexto antes de trocar.",
      );
    },
  },
  vocabulario_da_organizacao: {
    headline: () => "Vocabulário da organização",
    prose: (f) =>
      `«${flat(f.span.text)}» está no vocabulário que a sua organização declarou como não familiar ao leitor dela. ` +
      "Este apontamento vem da organização, não da norma.",
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `O termo aparece exatamente como a organização o declarou, e ela registrou “${f.suggestion}” como equivalente. Se ele serve nesta frase, quem confere é você, antes de clicar.`,
        };
      return assistida(
        "O termo aparece exatamente como a organização o declarou, mas ela não registrou um equivalente. Decida se ele fica, ganha uma explicação ou é trocado; o Lucid não propõe substituto.",
      );
    },
  },
  sigla_sem_expansao: {
    headline: (f) => {
      const a = metaStr(f, "acronym");
      return a ? `Sigla sem expansão · “${a}”` : "Sigla sem expansão";
    },
    prose: (f) => {
      const a = metaStr(f, "acronym");
      return `A sigla${a ? ` “${a}”` : ""} aparece aqui sem ter sido escrita por extenso antes. Só esta primeira ocorrência é apontada.`;
    },
    confidence: () =>
      assistida(
        "O Lucid localiza com segurança a primeira ocorrência sem apresentação, mas não sabe o que a sigla significa. Informe o nome por extenso nesta primeira ocorrência.",
      ),
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
        th != null ? `, e o Lucid aponta frases a partir de ${th}` : ""
      }. A contagem vem de conectivos de uma lista curada, sem interpretar o conteúdo.`;
    },
    confidence: (f) => {
      const c = metaNum(f, "clauses");
      return assistida(
        `A contagem de conectivos é exata${
          c != null ? ` (${c} nesta frase)` : ""
        }, mas não mede se a frase ficou difícil: algumas subordinadas são curtas e claras. Leia a frase e confira se ela prende ideias demais.`,
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
      return `O texto se refere ao leitor em terceira pessoa${noun ? ` (“${noun}”)` : ""}${
        verb ? ` e lhe atribui uma obrigação (“${verb}”)` : ""
      }: fala sobre o leitor, em vez de falar com ele.`;
    },
    confidence: (f) => {
      const noun = metaStr(f, "readerNoun");
      return assistida(
        `O Lucid reconhece com segurança uma palavra que costuma nomear o leitor, como sujeito de uma obrigação. Confira se ${
          noun ? `“${noun}”` : "essa pessoa"
        } é mesmo quem lê o documento e se falar diretamente com ela cabe no tom do texto.`,
      );
    },
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
      const jump =
        l != null && p != null
          ? `A hierarquia de títulos pula do nível ${p} para o ${l}, sem o nível intermediário.`
          : "A hierarquia de títulos pula um nível, sem o nível intermediário.";
      return `${jump} O nível vem da marcação de título do documento, não do tamanho da letra.`;
    },
    confidence: () =>
      assistida(
        "Os níveis são lidos com exatidão da marcação do documento. Confira se este título deve subir de nível ou se falta um título intermediário: isso depende de como o conteúdo está organizado.",
      ),
  },
  nominalizacao_encadeada: {
    headline: (f) => (metaStr(f, "kind") === "chain" ? "Nominalizações em cadeia" : "Nominalizações concentradas"),
    prose: (f) =>
      metaStr(f, "kind") === "chain"
        ? `Em «${flat(f.span.text)}», a ação aparece como substantivo e se liga por “de” a outro substantivo abstrato. O trecho fica mais abstrato e deixa menos claro quem realiza a ação.`
        : `A frase concentra ${metaNum(f, "count") ?? "vários"} substantivos que nomeiam ações. Juntos, eles deixam a leitura mais abstrata e escondem quem faz o quê.`,
    confidence: () =>
      assistida(
        "Os substantivos são localizados com segurança, a partir de uma lista curada. Nem todo substantivo de ação precisa sair, e devolver a ação ao verbo exige saber quem a pratica: confira se o texto diz quem age.",
      ),
  },
  mais_que_perfeito_sintetico: {
    confidence: () =>
      assistida(
        "A forma foi reconhecida com segurança e está gramaticalmente correta; o que pesa é ser rara na fala. Ao reescrever, confira se o auxiliar e a pessoa do verbo concordam com o resto da frase.",
      ),
  },
  gerundismo: {
    confidence: () =>
      assistida(
        "O padrão “ir + estar + gerúndio” foi reconhecido com segurança. Ao trocar pelo futuro ou pelo presente, confira se a frase continua dizendo quando a ação acontece.",
      ),
  },
  adverbio_mente_denso: {
    confidence: () =>
      assistida(
        "Critério descontinuado e desligado por padrão: conta quantos advérbios em -mente há na frase, sem avaliar cada um. “Advérbios vagos” o substitui. Confira quais advérbios acrescentam sentido antes de cortar.",
      ),
  },
  adverbios_vagos: {
    confidence: () =>
      assistida(
        "O advérbio foi reconhecido com segurança, a partir de uma lista curada. Se ele só reforça ou também muda o que a frase afirma depende da ênfase que você quer dar.",
      ),
  },
  redundancia: {
    confidence: () =>
      assistida(
        "A expressão foi reconhecida com segurança, a partir de uma lista curada. Qual termo cortar depende da frase: confira se o que sobra diz o mesmo.",
      ),
  },
  perifrase_inflada: {
    confidence: () =>
      assistida(
        "A locução foi reconhecida com segurança, a partir de uma lista curada. Uma forma mais curta pode mudar a regência ou o sentido do que vem depois: confira a frase inteira antes de trocar.",
      ),
  },
  paragraph_length: {
    confidence: () =>
      assistida(
        "A contagem de frases é exata, e o limite é um parâmetro do Lucid, não da norma. Confira se o parágrafo trata de mais de uma ideia; onde separar depende de como elas se organizam.",
      ),
  },
  prose_enumeration: {
    confidence: () =>
      assistida(
        "Os marcadores de sequência foram reconhecidos com segurança. Confira se os itens se entendem soltos, numa lista, ou se dependem do texto que os liga.",
      ),
  },
  mesoclise: {
    confidence: () =>
      assistida(
        "A mesóclise foi reconhecida com segurança e está gramaticalmente correta; o que pesa é ser rara. Reescrever sem ela muda a construção da frase; confira se a versão nova diz quem faz o quê.",
      ),
  },
  dupla_negacao: {
    confidence: () =>
      assistida(
        "A dupla negação foi reconhecida com segurança, a partir de uma lista curada. Afirmar direto (“é comum” no lugar de “não é incomum”) pode perder a nuance que você quis dar: confira se ela importa aqui.",
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null ? `Título longo · ${w} palavras` : "Título longo";
    },
    confidence: () =>
      assistida(
        "A medida do título (palavras, frases e ponto final) é exata, e o limite de palavras é um parâmetro do Lucid. Confira o que é essencial para o leitor localizar a seção; o resto pode ir para o texto.",
      ),
  },
  single_item_list: {
    confidence: () =>
      assistida(
        "A contagem é exata: a lista tem um item só. Confira se falta algum item ou se o conteúdo cabe melhor no texto corrido.",
      ),
  },
};

export const NARRATIVE_UI_PT = BASE;
