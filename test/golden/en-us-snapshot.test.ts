import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";

const CASES: Record<string, string> = {
  empty: "",
  plain_sentence: "Send the form to us by March 31.",
  long_sentence:
    "You can apply if you live in the state and your household income is below the limit set by the agency for " +
    "the current year, which the agency publishes each January on its website.",
  structure:
    "# Benefits\n\n#### Eligibility\n\n- Proof of address\n\n## How to apply.\n\nSend the form. We answer within ten days.",
  abbreviations: "Mr. Smith met Rep. Jones on Jan. 5 about form No. 12. The meeting ran 30 min. Then it ended.",
  hidden_verb:
    "If you cannot make the payment of the $100 fee, you must make an application in writing. We made a " +
    "decision. Take the first position in line.",
  reader_in_third_person:
    "Applicants must submit Form 12 by May 1. If you are the lessee, you must monitor the operator.",
  ambiguous_shall: "The lessee shall file an application. The applicant shall not remove timber.",
  undefined_acronym:
    "The FAA denied the request. The Social Security Administration (SSA) and the SSA office agree. Your ATM card works.",
  prose_enumeration:
    "Bring these documents: a photo ID, proof of address, and your lease. You must (1) register, (2) pay, and (3) attend.",
  passive:
    "Your application was approved by the director. Late payments will not be accepted. The deadline has " +
    "been extended by March 31. She is interested in the program.",
};

describe("en-US — full Diagnostic snapshots", () => {
  it.each(Object.entries(CASES))("%s", (_id, text) => {
    expect(analyzeWithLocale(text, localeEnUS)).toMatchSnapshot();
  });
});
