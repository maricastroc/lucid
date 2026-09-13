import type { EnGoldenEntry } from "./measure";

export const GOLDEN_PROSE_ENUMERATION_EN: readonly EnGoldenEntry[] = [
  {
    text:
      "With your application, provide the following information: the depth of the well, the casing and cementing " +
      "program, the circulation media (mud, air or foam), the expected depth and thickness of fresh water zones, " +
      "and well site layout and design.",
    expectedCount: 1,
    status: "correct",
  },
  {
    text: "To apply, (a) fill out Form 12, (b) attach proof of income, and (c) mail both to our office.",
    expectedCount: 1,
    status: "correct",
  },
  { text: "You must (1) register, (2) pay the fee, and (3) attend the hearing.", expectedCount: 1, status: "correct" },
  {
    text: "First, read the notice. Second, fill out the form. Third, mail it to us.",
    expectedCount: 1,
    status: "correct",
  },
  { text: "Bring these documents: a photo ID, proof of address, and your lease.", expectedCount: 1, status: "correct" },
  {
    text: "The program has three parts: (i) training, (ii) placement and (iii) follow-up.",
    expectedCount: 1,
    status: "correct",
  },
  {
    text: "Firstly, check your eligibility. Secondly, gather your documents. Thirdly, apply online.",
    expectedCount: 1,
    status: "correct",
  },
  {
    text: "The fee covers three things: the review, the hearing and the final notice.",
    expectedCount: 1,
    status: "correct",
  },

  { text: "You need a photo ID, proof of address, and your lease.", expectedCount: 0, status: "correct" },
  { text: "This is the first time we have written to you.", expectedCount: 0, status: "correct" },
  { text: "Send it to the second floor, third door on the left.", expectedCount: 0, status: "correct" },
  { text: "Note: the office is closed on Monday.", expectedCount: 0, status: "correct" },
  { text: "Bring two things: your ID and your lease.", expectedCount: 0, status: "correct" },
  { text: "See section 5(a), 5(b) and 5(c) of the rule.", expectedCount: 0, status: "correct" },
  { text: "Answer (a) or (b).", expectedCount: 0, status: "correct" },
  { text: "The lease, the permit, and the bond are all due.", expectedCount: 0, status: "correct" },
  { text: "# Steps\n\n1. Fill out the form.\n2. Attach proof.\n3. Mail it.", expectedCount: 0, status: "correct" },
  { text: "Items (b), (c) and (d) apply to renters.", expectedCount: 0, status: "correct" },

  {
    text: "You will need your ID, your lease, a pay stub, and a utility bill to apply.",
    expectedCount: 1,
    status: "known_limitation",
    reason: "A series without a colon is not read: flagging every 'A, B, and C' would bury the real lists.",
  },
  {
    text: "Note: the office closes at noon, on weekends, and on federal holidays.",
    expectedCount: 0,
    status: "known_limitation",
    reason: "A colon that introduces an explanation, not a list, is read as a list when a series follows it.",
  },
];
