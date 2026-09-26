import { createOrganizationVocabularyPass } from "../../_shared";
import type { PtConfig } from "../config";

const declaredReason = (reason: string): string => (reason === "" ? "" : ` Motivo declarado: ${reason}`);

export const vocabularioOrganizacaoPass = createOrganizationVocabularyPass<PtConfig>({
  criterion: "vocabulario_da_organizacao",
  caseLocale: "pt-BR",
  read: (config) => config.vocabulario,
  text: {
    withEquivalent: (plain, reason) =>
      `A organização declarou que este termo não é familiar ao leitor dela e registrou “${plain}” como ` +
      "equivalente. O Lucid não verificou esse sentido: confira se o equivalente serve nesta frase antes " +
      `de usá-lo.${declaredReason(reason)}`,
    withoutEquivalent: (reason) =>
      "A organização declarou que este termo não é familiar ao leitor dela, mas não registrou equivalente. " +
      "O Lucid só sinaliza e não sugere troca. Use uma palavra que o leitor conheça ou explique o termo na " +
      `primeira vez que ele aparecer.${declaredReason(reason)}`,
  },
});
