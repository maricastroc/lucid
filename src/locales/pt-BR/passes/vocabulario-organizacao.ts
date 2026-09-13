import { createOrganizationVocabularyPass } from "../../_shared";
import type { PtConfig } from "../config";

const declaredReason = (reason: string): string => (reason === "" ? "" : ` Motivo declarado: ${reason}`);

export const vocabularioOrganizacaoPass = createOrganizationVocabularyPass<PtConfig>({
  criterion: "vocabulario_da_organizacao",
  caseLocale: "pt-BR",
  read: (config) => config.vocabulario,
  text: {
    withEquivalent: (plain, reason) =>
      `Termo do vocabulário da organização: ela declarou que este termo não é familiar ao leitor ` +
      `dela e registrou "${plain}" como equivalente. A troca é decisão sua — a ferramenta não ` +
      `reescreve.${declaredReason(reason)}`,
    withoutEquivalent: (reason) =>
      `Termo do vocabulário da organização: ela declarou que este termo não é familiar ao leitor ` +
      `dela, e NÃO registrou um equivalente simples. Aqui isto é sinalização, não proposta: sem um ` +
      `equivalente atestado, sugerir uma troca seria a ferramenta inventando o que a organização não ` +
      `disse.${declaredReason(reason)}`,
  },
});
