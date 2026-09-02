import { assistida, flat, metaBool, metaNum, metaStr, type NarrativeSet } from "./narrative-types";

const DOMAIN_PT: Record<string, string> = {
  administrative: "administrativo",
  legal: "jurídico",
  general: "técnico",
};

export const NARRATIVE_PT: NarrativeSet = {
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Frase com ${w} palavras` : "Comprimento de frase";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "O comprimento desta frase está acima do gatilho de inspeção.";
      return (
        `Esta frase tem ${w} palavras. O Lucid inspeciona frases acima de ${th} palavras — esse número é um ` +
        "parâmetro metodológico do produto, e não um limite da norma: a ABNT NBR ISO 24495-1 pede frases " +
        "concisas e variação de tamanho, sem estabelecer contagem. A verificação principal é outra: veja se a " +
        "frase carrega mais de uma ideia. Uma frase extensa com uma ideia só pode estar adequada e não " +
        "precisa necessariamente ser dividida."
      );
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `A ferramenta mede o comprimento com exatidão${
          w != null && th != null ? ` (${w} palavras contra o gatilho de ${th})` : ""
        }, mas o comprimento sozinho não decide se a frase está clara: ele não distingue uma ideia longa de ` +
          "várias ideias empilhadas, e não vê nome de órgão, referência legal nem valor por extenso, que " +
          "alongam a frase sem multiplicar o que ela pede do leitor. Quem lê a frase e conta as ideias é você.",
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
        return `${trecho} A oração começa no verbo e o sujeito vem depois do particípio — ordem que só a passiva admite. O texto não diz quem pratica a ação.`;
      }
      return `${trecho} ${
        metaBool(f, "hasAgent") ? "O agente aparece no próprio trecho." : "O texto não diz quem praticou a ação."
      }`;
    },
    confidence: (f) =>
      assistida(
        metaStr(f, "eventiveness") === "postposed_subject"
          ? `A ordem verbo-sujeito confirma a passiva, mas o agente não está no texto: virar para a ativa exigiria dizer quem pratica a ação, e isso a ferramenta se recusa a inventar.`
          : metaBool(f, "hasAgent")
            ? `O agente está no texto, então a informação existe — mas virar para a ativa exige reordenar sujeito e objeto e reconjugar o verbo. Isso está fora da garantia mecânica: a ferramenta monta o andaime, a frase final é sua.`
            : `Além de reordenar e reconjugar, aqui o agente não está no texto: reescrever na ativa exigiria inventar quem praticou a ação. A ferramenta se recusa a fabricar e devolve a decisão a você.`,
      ),
  },
  passiva_sintetica: {
    headline: () => "Voz passiva sintética (“se”)",
    prose: (f) =>
      metaStr(f, "position") === "proclitic"
        ? `«${flat(f.span.text)}» põe o “se” antes do verbo: a ação existe, mas o texto não diz quem a pratica (“não se aplica a multa” — quem aplica?). O detector só marca a próclise depois de uma palavra que a obriga (“${metaStr(f, "attractor") ?? "não"}”, aqui), posição onde o “se” não pode ser o condicional; e exclui os verbos inerentemente pronominais (trata-se, refere-se…).`
        : `«${flat(f.span.text)}» usa o “se” enclítico: a ação existe, mas o texto não diz quem a pratica (“aplica-se a multa” — quem aplica?). O detector marca a forma enclítica “verbo-se” e exclui os verbos inerentemente pronominais (trata-se, refere-se…).`,
    confidence: () =>
      assistida(
        `O “se” é ambíguo — pode ser passiva, indeterminação do sujeito ou reflexivo. A ferramenta não desfaz essa ambiguidade nem inventa o agente: aponta a construção e devolve a decisão a você.`,
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
      const base = metaStr(f, "baseVerb");
      if (!f.requiresHuman)
        return assistida(
          `O mapeamento para o verbo${base ? ` “${base}”` : ""} é único e vem de léxico curado — mas reconjugar e ajustar o complemento é escrever, e a engine não escreve. Devolva a ação ao verbo na sua edição, ou peça a reescrita à IA; a engine verifica o resultado.`,
        );
      return assistida(
        `A construção foi detectada, mas o mapeamento desta palavra para um único verbo não é seguro (mais de um sentido possível). Escolher o verbo${base ? ` — talvez “${base}” —` : ""} é decisão sua; a ferramenta não escolhe por você.`,
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
          rationale: `“${flat(f.span.text)}” consta no glossário curado com um equivalente único e independente de contexto; trocar por “${f.suggestion}” preserva a regência e não pede reconjugação. É uma substituição 1:1 — a ferramenta assina a equivalência; a troca no texto é sua.`,
        };
      return assistida(
        `Há um equivalente mais simples, mas a troca depende do que vem depois na frase: aplicá-la às cegas poderia quebrar a concordância. A ferramenta detecta e aponta o caminho, mas deixa a troca com você.`,
      );
    },
  },
  vocabulario_da_organizacao: {
    headline: () => "Vocabulário da organização",
    prose: (f) =>
      `«${flat(f.span.text)}» está no vocabulário que a sua organização declarou como não familiar ao leitor dela. ` +
      `Isto não vem da norma — vem de quem conhece o público deste documento.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `A organização registrou “${f.suggestion}” como equivalente deste termo. Quem assina a equivalência é ela, não a ferramenta nem a norma; a troca no texto continua sendo sua.`,
        };
      return assistida(
        "A organização declarou o termo, mas não registrou equivalente. Sem uma troca atestada, aqui só cabe sinalizar: propor uma substituição seria a ferramenta inventar o que ninguém disse.",
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
      return `A sigla${a ? ` “${a}”` : ""} aparece sem ter sido apresentada por extenso antes desta ocorrência. O detector marca apenas a PRIMEIRA vez não definida, e ignora UFs, unidades e siglas universais (CPF, CEP…).`;
    },
    confidence: () =>
      assistida(
        `A ferramenta localiza a primeira ocorrência não definida com exatidão, mas escrever o nome por extenso — “Nome Por Extenso (SIGLA)” — é redação sua; ela não sabe o que a sigla significa nem inventa a expansão.`,
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
  nominalizacao_encadeada: {
    headline: (f) => (metaStr(f, "kind") === "chain" ? "Nominalizações em cadeia" : "Nominalizações concentradas"),
    prose: (f) =>
      metaStr(f, "kind") === "chain"
        ? `«${flat(f.span.text)}» esconde a ação num substantivo que governa outro substantivo abstrato por “de” — a frase empilha abstrações no lugar de dizer quem faz o quê.`
        : `A frase concentra ${metaNum(f, "count") ?? "vários"} substantivos de ação — cada um esconde um verbo, e o acúmulo pesa a leitura.`,
    confidence: () =>
      assistida(
        `A detecção é por léxico curado e adjacência — sem interpretação. Mas desfazer a nominalização é devolver a ação ao verbo e dizer quem a pratica, o que muda a estrutura da frase; a ferramenta não reescreve nem inventa o agente.`,
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
        `Critério descontinuado (ADR-058): conta advérbios em -mente por densidade. Substituído por “Advérbios vagos”, que mira o advérbio-fumaça em si. Desligado por padrão.`,
      ),
  },
  adverbios_vagos: {
    confidence: () =>
      assistida(
        `A ferramenta reconhece o advérbio vago pelo léxico curado, mas decidir se cortá-lo enfraquece ou limpa a frase depende da ênfase que você quer — por isso é um sinal fraco (info) que aponta, não corrige.`,
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
        `(o título tem ${hw ?? "poucas"}). A comparação normaliza plural/singular (documentos ≈ documento), mas ` +
        "não relaciona derivações nem sinônimos; é um proxy fraco de localização, não prova de que o título está errado."
      );
    },
    confidence: () =>
      assistida(
        `Este é o sinal mais fraco da ferramenta: um proxy determinístico (sobreposição de palavras), não uma leitura de sentido. Decidir se o título precisa mudar — e para quê — é trabalho de autor; a ferramenta não reescreve títulos.`,
      ),
  },
};
