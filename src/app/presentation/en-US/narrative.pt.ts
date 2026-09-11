import type { EnCriterionId } from "@/locales/en-US/criteria";
import { assistida, flat, metaBool, metaNum, metaStr, type CriterionNarrative } from "../../lib/narrative-types";

export const EN_NARRATIVE_UI_PT: Record<EnCriterionId, CriterionNarrative> = {
  prose_enumeration: {
    headline: (f) => {
      const items = metaNum(f, "items");
      return items !== null ? `Enumeração em prosa · ${items} itens` : "Enumeração em prosa";
    },
    prose: (f) => {
      const items = metaNum(f, "items") ?? 0;
      const notation = metaStr(f, "notation");
      const how =
        notation === "series"
          ? `dois-pontos introduzem ${items} itens separados por vírgula numa só frase`
          : notation === "ordinals"
            ? `${items} etapas são anunciadas por ordinais (“First… Second… Third…”) no texto corrido`
            : `${items} itens são marcados (“(a)… (b)… (c)…”) dentro do texto corrido`;
      return `Aqui ${how}. As diretrizes federais americanas recomendam lista vertical, com frase de introdução, para requisitos, etapas e condições. O número mínimo de itens é provisório e configurável.`;
    },
    confidence: () =>
      assistida(
        "A ferramenta conta os itens com exatidão, mas transformar a série em lista muda a estrutura do texto — e decidir se a lista ajuda este leitor é seu. O Lucid não converte.",
      ),
  },
  undefined_acronym: {
    headline: (f) => {
      const acronym = metaStr(f, "acronym");
      return acronym !== null ? `Sigla sem expansão · ${acronym}` : "Sigla sem expansão";
    },
    prose: (f) =>
      `«${metaStr(f, "acronym") ?? flat(f.span.text)}» aparece aqui pela primeira vez sem ter sido apresentada por extenso. As diretrizes federais americanas pedem definir a sigla no primeiro uso — “Federal Aviation Administration (FAA)” — ou trocá-la por um apelido, como “the committee”.`,
    confidence: () =>
      assistida(
        "A ferramenta vê que a sigla ainda não foi definida no texto, mas não sabe o que ela significa nem se o seu leitor já a conhece. Escrever por extenso — ou decidir que não precisa — é seu.",
      ),
  },
  ambiguous_shall: {
    headline: (f) => (metaBool(f, "negated") ? "“Shall not” ambíguo" : "“Shall” ambíguo"),
    prose: (f) =>
      metaBool(f, "negated")
        ? `«${flat(f.span.text)}» pode expressar uma proibição ou uma previsão, e a frase não diz qual. Para proibição, as diretrizes federais recomendam “must not”; para previsão, “will not” é nota do Lucid.`
        : `«${flat(f.span.text)}» pode expressar obrigação, faculdade, recomendação ou previsão, e a frase não diz qual. As diretrizes federais recomendam “must” (obrigação), “may” (faculdade) e “should” (recomendação); para previsão, “will” é nota do Lucid.`,
    confidence: () =>
      assistida(
        "A ferramenta encontra toda ocorrência de “shall” com exatidão, mas não escolhe o sentido e não substitui a palavra: trocar por “must” quando o texto quis dizer “may” mudaria a obrigação do leitor. Só você sabe o que a frase quer dizer.",
      ),
  },
  reader_in_third_person: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun !== null ? `Leitor em terceira pessoa · “${noun}”` : "Leitor em terceira pessoa";
    },
    prose: (f) =>
      `«${flat(f.span.text)}» fala do leitor como “${metaStr(f, "readerNoun") ?? ""}” e lhe atribui uma obrigação ou permissão (“${metaStr(f, "deontic") ?? ""}”). Se o documento é lido por essa pessoa, dirigir-se a ela como “you” deixa claro quem deve agir.`,
    confidence: () =>
      assistida(
        "A ferramenta reconhece o substantivo e o modal, mas não sabe quem lê o documento: se ele se dirige a outra pessoa — um servidor que atende requerentes, por exemplo —, a terceira pessoa está certa. Decidir é seu.",
      ),
  },
  hidden_verb: {
    headline: (f) => {
      const verb = metaStr(f, "verb");
      if (verb !== null) return `Verbo escondido · “${verb}”`;
      return "Verbo possivelmente escondido";
    },
    prose: (f) => {
      const verb = metaStr(f, "verb");
      const excerpt = `«${flat(f.span.text)}»`;
      if (verb !== null) {
        const inflected = metaBool(f, "swap")
          ? ""
          : ` Aqui o verbo leve está flexionado (“${metaStr(f, "lightForm") ?? ""}”), e trocar sem flexionar quebraria a frase; o Lucid não flexiona verbos.`;
        return `${excerpt} usa um substantivo onde o verbo “${verb}” diria a ação diretamente. A equivalência está atestada nas Federal Plain Language Guidelines (2011, p. 23).${inflected}`;
      }
      return `${excerpt} junta um verbo leve a um substantivo terminado em “-${metaStr(f, "suffix") ?? ""}”, sufixo que costuma transformar verbo em substantivo. Nenhuma equivalência 1:1 está atestada para esta expressão, então o Lucid não nomeia o verbo.`;
    },
    confidence: (f) =>
      metaBool(f, "swap")
        ? {
            level: "segura",
            rationale: `A equivalência “${flat(f.span.text)}” → “${metaStr(f, "verb") ?? ""}” está atestada na fonte, e o verbo leve está na forma base, então a troca direta mantém a frase gramatical. A decisão de trocar continua sendo sua.`,
          }
        : assistida(
            "O sufixo indica um substantivo derivado de verbo, mas não prova que ele esconde a ação da frase, e sem equivalência atestada o Lucid não escolhe o verbo. Ver se um único verbo diz a ação — e reescrever — é trabalho de autor.",
          ),
  },
  passive_voice: {
    headline: (f) => (metaBool(f, "hasAgent") ? "Voz passiva com agente" : "Voz passiva sem agente"),
    prose: (f) => {
      const excerpt = `«${flat(f.span.text)}» combina uma forma de “be” com um particípio passado.`;
      if (metaBool(f, "hasAgent")) {
        return `${excerpt} Quem pratica a ação aparece depois do verbo, introduzido por “by”.`;
      }
      const state =
        metaStr(f, "form") === "present"
          ? " No presente e sem agente, a construção também pode descrever um estado (“the office is closed”) em vez de uma ação; só o contexto decide."
          : "";
      return `${excerpt} O texto não diz quem pratica a ação.${state}`;
    },
    confidence: (f) =>
      metaBool(f, "hasAgent") && !metaBool(f, "agentTruncated")
        ? assistida(
            "A ferramenta encontrou o agente, mas decidir se a frase fica mais clara na voz ativa — e reescrevê-la — é trabalho de autor; o Lucid não converte vozes.",
          )
        : assistida(
            "O agente não está no texto (ou passa da janela que o Lucid lê): a ferramenta se recusa a inventar quem pratica a ação. Só você sabe quem age.",
          ),
  },
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Frase com ${w} palavras` : "Comprimento de frase";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "O comprimento desta frase está acima do gatilho de inspeção.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      return (
        `Esta frase tem ${w} palavras. O Lucid inspeciona frases em inglês acima de ${th} palavras — esse número ` +
        "é uma referência interina emprestada do GOV.UK (Reino Unido), não uma recomendação federal americana, e " +
        `não foi validado para documentos americanos: é provisório e configurável. A ${standard} pede frases ` +
        "concisas e variação de tamanho, sem estabelecer contagem. A verificação principal é outra: veja se a " +
        "frase carrega mais de uma ideia."
      );
    },
    confidence: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return assistida(
        `A ferramenta conta as palavras com exatidão${
          w != null && th != null ? ` (${w} palavras contra o gatilho provisório de ${th})` : ""
        }, mas o gatilho não foi validado para inglês americano e o comprimento sozinho não decide se a frase ` +
          "está clara. Quem lê a frase e conta as ideias é você.",
      );
    },
  },
  paragraph_length: {
    headline: (f) => {
      const n = metaNum(f, "sentences");
      return n != null ? `Parágrafo com ${n} frases` : "Parágrafo longo";
    },
    prose: (f) => {
      const n = metaNum(f, "sentences");
      const th = metaNum(f, "threshold");
      return (
        `Este parágrafo tem ${n ?? "muitas"} frases num bloco só; o Lucid inspeciona parágrafos acima de ` +
        `${th ?? "o limite configurado"}. O limite é provisório: vem do teto de “três a oito frases” das Federal ` +
        "Plain Language Guidelines (2011), atribuído a especialistas não nomeados, e não foi validado."
      );
    },
    confidence: () =>
      assistida(
        "A ferramenta conta as frases do parágrafo com exatidão, mas onde cortá-lo em blocos menores depende da organização das ideias — decisão de autor.",
      ),
  },
  long_heading: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return metaStr(f, "reason") === "length" && w != null
        ? `Título longo · ${w} palavras`
        : "Título em forma de frase";
    },
    prose: (f) => {
      if (metaStr(f, "reason") === "sentence") {
        return "Este título está pontuado como frase. Um título funciona como rótulo para varrer o documento; em forma de frase, pede leitura em vez de reconhecimento.";
      }
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      return (
        `Este título tem ${w ?? "muitas"} palavras, acima do limite provisório de ${th ?? "palavras"}. Nenhuma ` +
        "fonte americana nem a ISO fixa tamanho de título, e as diretrizes federais recomendam títulos em forma de " +
        "pergunta, que podem ser mais longos — então este é um ponto para olhar, não um defeito."
      );
    },
    confidence: () =>
      assistida(
        "A ferramenta mede o título com exatidão, mas decidir se ele precisa encurtar — ou se é uma pergunta que o leitor faria — é trabalho de autor.",
      ),
  },
  heading_level_skip: {
    headline: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return l != null && p != null ? `Salto de título · nível ${p}→${l}` : "Salto de nível de título";
    },
    prose: (f) => {
      const l = metaNum(f, "level");
      const p = metaNum(f, "prevLevel");
      return `A hierarquia de títulos pula do nível ${p ?? "anterior"} para o ${l ?? "seguinte"}, sem o degrau intermediário. O detector lê os níveis dos títulos — só existe porque o documento é estruturado.`;
    },
    confidence: () =>
      assistida(
        "A ferramenta lê os níveis dos títulos com exatidão, mas decidir se este título deve subir de nível ou se falta um título intermediário depende da organização do conteúdo — trabalho de autor.",
      ),
  },
  single_item_list: {
    headline: () => "Lista de um item",
    prose: () =>
      "Esta lista tem um único item. Uma lista serve para comparar vários itens; com um só, pode indicar item faltando ou uma frase que ficaria melhor no texto corrido.",
    confidence: () =>
      assistida(
        "A ferramenta reconhece a lista de um item só, mas decidir entre completar a lista ou dissolvê-la no texto corrido depende do conteúdo — decisão de autor.",
      ),
  },
  organization_vocabulary: {
    headline: () => "Vocabulário da organização",
    prose: (f) =>
      `«${flat(f.span.text)}» está no vocabulário que a sua organização declarou como não familiar ao leitor dela. ` +
      "Isto não vem da norma — vem de quem conhece o público deste documento.",
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `A organização registrou “${f.suggestion}” como equivalente deste termo. Quem assina a equivalência é ela, não a ferramenta nem a norma; a troca no texto continua sendo sua.`,
        };
      return assistida(
        "A organização declarou o termo, mas não registrou equivalente. Sem uma troca atestada, aqui só cabe sinalizar.",
      );
    },
  },
};
