import type { EnCriterionId } from "@/locales/en-US/criteria";
import { assistida, flat, metaBool, metaNum, metaStr, type CriterionNarrative } from "../../lib/narrative-types";

function limitOf(threshold: number | null, unit: string): string {
  return threshold != null ? `do limite provisório do Lucid (${threshold} ${unit})` : "do limite provisório do Lucid";
}

export const EN_NARRATIVE_UI_PT: Record<EnCriterionId, CriterionNarrative> = {
  prose_enumeration: {
    headline: (f) => {
      const items = metaNum(f, "items");
      return items !== null ? `Enumeração em prosa · ${items} itens` : "Enumeração em prosa";
    },
    prose: (f) => {
      const items = metaNum(f, "items") ?? 0;
      const notation = metaStr(f, "notation");
      const threshold = metaNum(f, "threshold");
      const how =
        notation === "series"
          ? `dois-pontos introduzem ${items} itens separados por vírgula numa só frase`
          : notation === "ordinals"
            ? `${items} etapas são anunciadas por ordinais (“First… Second… Third…”) no texto corrido`
            : `${items} itens são marcados (“(a)… (b)… (c)…”) dentro do texto corrido`;
      const minimum =
        threshold !== null
          ? `O Lucid aponta séries a partir de ${threshold} itens; esse mínimo é provisório e configurável.`
          : "O número mínimo de itens é provisório e configurável.";
      return `Aqui ${how}. ${minimum}`;
    },
    confidence: () =>
      assistida(
        "O Lucid conta os itens com exatidão, mas saber se uma lista ajuda depende do que são os itens e de quem os lê. Só você pode julgar isso; o Lucid não transforma a série em lista.",
      ),
  },
  undefined_acronym: {
    headline: (f) => {
      const acronym = metaStr(f, "acronym");
      return acronym !== null ? `Sigla sem expansão · ${acronym}` : "Sigla sem expansão";
    },
    prose: (f) =>
      `«${metaStr(f, "acronym") ?? flat(f.span.text)}» aparece aqui pela primeira vez sem ter sido escrita por extenso. As diretrizes federais americanas pedem que a sigla seja definida no primeiro uso, como em “Federal Aviation Administration (FAA)”.`,
    confidence: () =>
      assistida(
        "O Lucid vê que a sigla ainda não foi escrita por extenso, mas não sabe o que ela significa nem se o seu leitor já a conhece. Essa informação só você tem.",
      ),
  },
  ambiguous_shall: {
    headline: (f) => (metaBool(f, "negated") ? "“Shall not” ambíguo" : "“Shall” ambíguo"),
    prose: (f) =>
      metaBool(f, "negated")
        ? `«${flat(f.span.text)}» pode expressar uma proibição ou uma previsão, e a frase não diz qual. As diretrizes federais recomendam “must not” para proibição; “will not” para previsão é um acréscimo do Lucid.`
        : `«${flat(f.span.text)}» pode expressar obrigação, faculdade, recomendação ou previsão, e a frase não diz qual. As diretrizes federais recomendam “must” para obrigação, “may” para faculdade e “should” para recomendação; “will” para previsão é um acréscimo do Lucid.`,
    confidence: () =>
      assistida(
        "O Lucid encontra toda ocorrência de “shall”, mas não escolhe o sentido: pôr “must” onde o texto quis dizer “may” mudaria o que o leitor é obrigado a fazer. Só você sabe o que a frase quer dizer.",
      ),
  },
  reader_in_third_person: {
    headline: (f) => {
      const noun = metaStr(f, "readerNoun");
      return noun !== null ? `Leitor em terceira pessoa · “${noun}”` : "Leitor em terceira pessoa";
    },
    prose: (f) =>
      `«${flat(f.span.text)}» fala do leitor como “${metaStr(f, "readerNoun") ?? ""}” e lhe atribui uma obrigação ou permissão (“${metaStr(f, "deontic") ?? ""}”). Falar com o leitor como “you” deixa claro quem deve agir.`,
    confidence: () =>
      assistida(
        "O Lucid reconhece o substantivo e o modal, mas não sabe para quem o documento foi escrito. Se ele se dirige a outra pessoa, como um servidor que atende requerentes, a terceira pessoa está certa.",
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
          : ` Aqui “${metaStr(f, "lightForm") ?? ""}” está flexionado, então “${verb}” precisaria do tempo e da concordância correspondentes.`;
        return `${excerpt} esconde a ação num substantivo; o verbo “${verb}” a expressa diretamente. As Federal Plain Language Guidelines (2011, p. 23) registram este par.${inflected}`;
      }
      return `${excerpt} junta um verbo leve a um substantivo terminado em “-${metaStr(f, "suffix") ?? ""}”, sufixo que costuma transformar verbo em substantivo. Nenhum verbo está atestado para esta expressão, então o Lucid não nomeia o verbo.`;
    },
    confidence: (f) => {
      const verb = metaStr(f, "verb");
      if (metaBool(f, "swap")) {
        return {
          level: "segura",
          rationale: `Confira se “${verb ?? ""}” diz o mesmo que «${flat(f.span.text)}» nesta frase antes de usá-lo.`,
        };
      }
      if (verb !== null) {
        return assistida(
          `O Lucid não flexiona verbos, então não consegue oferecer “${verb}” na forma que esta frase pede. Reescrever a expressão fica com você.`,
        );
      }
      return assistida(
        "O sufixo costuma indicar um substantivo derivado de verbo, mas isso não prova que ele esconde a ação da frase, e nenhum verbo está atestado para esta expressão.",
      );
    },
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
          ? " No presente, a construção também pode descrever um estado (“the office is closed”) em vez de uma ação; só o contexto decide."
          : "";
      return `${excerpt} O texto não diz quem pratica a ação.${state}`;
    },
    confidence: (f) => {
      if (metaBool(f, "hasAgent") && !metaBool(f, "agentTruncated")) {
        return assistida(
          "O Lucid encontrou o agente, mas saber se a frase fica melhor na voz ativa depende do que o leitor precisa saber primeiro. Essa decisão é sua.",
        );
      }
      if (metaBool(f, "hasAgent")) {
        return assistida(
          "O agente passa do trecho que o Lucid lê depois de “by”, então pode estar incompleto aqui. Confira quem pratica a ação na frase inteira antes de mudar algo.",
        );
      }
      return assistida("Só você sabe quem pratica a ação; o Lucid não adivinha nem preenche.");
    },
  },
  long_sentence: {
    headline: (f) => {
      const w = metaNum(f, "words");
      return w != null ? `Frase com ${w} palavras` : "Comprimento de frase";
    },
    prose: (f) => {
      const w = metaNum(f, "words");
      const th = metaNum(f, "threshold");
      if (w == null || th == null) return "Esta frase passa do gatilho de comprimento que o Lucid usa para inglês.";
      const standard = f.normativeReference?.standard ?? "ISO 24495-1";
      return (
        `Esta frase tem ${w} palavras, acima do gatilho de ${th} palavras que o Lucid usa para inglês. O gatilho ` +
        "é provisório e configurável: uma referência emprestada do GOV.UK (Reino Unido), que não é recomendação " +
        `federal americana e não foi validada para documentos americanos. A ${standard} pede frases concisas e ` +
        "de tamanho variado, sem fixar número."
      );
    },
    confidence: () =>
      assistida(
        "O Lucid conta as palavras com exatidão, mas não distingue uma ideia longa de várias ideias empilhadas. O tamanho sozinho não decide se a frase está clara.",
      ),
  },
  paragraph_length: {
    headline: (f) => {
      const n = metaNum(f, "sentences");
      return n != null ? `Parágrafo com ${n} frases` : "Parágrafo longo";
    },
    prose: (f) => {
      const n = metaNum(f, "sentences");
      return (
        `Este parágrafo tem ${n ?? "muitas"} frases num bloco só, acima ${limitOf(metaNum(f, "threshold"), "frases")}. ` +
        "O limite vem das Federal Plain Language Guidelines (2011) e não foi validado."
      );
    },
    confidence: () =>
      assistida(
        "O Lucid conta as frases com exatidão, mas onde dividir o parágrafo depende de como as ideias estão organizadas, e essa decisão é sua.",
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
        return "Este título está pontuado como frase. O leitor varre títulos como rótulos; em forma de frase, o título precisa ser lido em vez de reconhecido de relance.";
      }
      const w = metaNum(f, "words");
      return (
        `Este título tem ${w ?? "muitas"} palavras, acima ${limitOf(metaNum(f, "threshold"), "palavras")}. Nem a ISO nem ` +
        "as fontes americanas fixam tamanho de título, e as diretrizes federais recomendam títulos em forma de " +
        "pergunta, que podem ser mais longos. Trate isto como um ponto para conferir, não como defeito."
      );
    },
    confidence: () =>
      assistida(
        "O Lucid mede o título com exatidão, mas se ele funciona como rótulo para este leitor, ou como a pergunta que o leitor faria, é você quem decide.",
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
      return l != null && p != null
        ? `A hierarquia de títulos pula do nível ${p} para o nível ${l}, sem o nível intermediário.`
        : "A hierarquia de títulos pula um nível aqui.";
    },
    confidence: () =>
      assistida(
        "O Lucid lê os níveis dos títulos com exatidão, mas a correção certa depende de como o conteúdo está organizado, e só você sabe isso.",
      ),
  },
  single_item_list: {
    headline: () => "Lista de um item",
    prose: () =>
      "Esta lista tem um único item. Pode estar faltando um item, ou o conteúdo pode ficar melhor como frase do texto corrido.",
    confidence: () =>
      assistida("O Lucid lê a estrutura da lista com exatidão, mas só você sabe se está faltando um item."),
  },
  organization_vocabulary: {
    headline: () => "Vocabulário da organização",
    prose: (f) =>
      `«${flat(f.span.text)}» está na lista de termos que a sua organização declarou como não familiares ao leitor dela.`,
    confidence: (f) => {
      if (f.suggestion !== undefined)
        return {
          level: "segura",
          rationale: `A sua organização registrou “${f.suggestion}” para este termo. O Lucid não verifica o sentido: confirme que “${f.suggestion}” serve nesta frase antes de usá-lo.`,
        };
      return assistida("A sua organização não registrou equivalente para este termo, então o Lucid só o aponta.");
    },
  },
};
