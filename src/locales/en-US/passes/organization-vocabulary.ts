import { createOrganizationVocabularyPass } from "../../_shared";
import type { EnConfig } from "../config";

const declaredReason = (reason: string): string => (reason === "" ? "" : ` Declared reason: ${reason}`);

export const organizationVocabularyPass = createOrganizationVocabularyPass<EnConfig>({
  criterion: "organization_vocabulary",
  caseLocale: "en-US",
  read: (config) => config.organizationVocabulary,
  text: {
    withEquivalent: (plain, reason) =>
      "Term from the organization's vocabulary: the organization declared this term unfamiliar to its readers " +
      `and recorded “${plain}” as its equivalent. Lucid does not check the meaning: confirm that “${plain}” ` +
      "fits this sentence before you use it." +
      declaredReason(reason),
    withoutEquivalent: (reason) =>
      "Term from the organization's vocabulary: the organization declared this term unfamiliar to its readers " +
      "but recorded no equivalent. Explain the term or replace it with words the reader knows. Lucid does not " +
      "suggest a replacement the organization did not record." +
      declaredReason(reason),
  },
});
