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
      `and recorded "${plain}" as its equivalent. Swapping it is your decision — the tool does not rewrite.` +
      declaredReason(reason),
    withoutEquivalent: (reason) =>
      "Term from the organization's vocabulary: the organization declared this term unfamiliar to its readers " +
      "and did NOT record a plain equivalent. This is a flag, not a proposal: without an attested equivalent, " +
      "suggesting a swap would be the tool inventing what the organization did not say." +
      declaredReason(reason),
  },
});
