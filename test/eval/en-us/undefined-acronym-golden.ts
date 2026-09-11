import type { EnGoldenEntry } from "./measure";

export const GOLDEN_ACRONYM_EN: readonly EnGoldenEntry[] = [
  { text: "The FAA denied the request.", expectedCount: 1, status: "correct" },
  { text: "Contact the SSA for your benefits statement.", expectedCount: 1, status: "correct" },
  { text: "Send the form to HUD.", expectedCount: 1, status: "correct" },
  { text: "The EPA and the DOT signed the agreement.", expectedCount: 2, status: "correct" },
  { text: "Under the ADA, employers must provide access.", expectedCount: 1, status: "correct" },
  { text: "Your FAFSA must reach us by June 30.", expectedCount: 1, status: "correct" },
  { text: "File your claim with FEMA.", expectedCount: 1, status: "correct" },
  { text: "Keep copies of all SSNs you list.", expectedCount: 1, status: "correct" },
  { text: "The OMB guidance applies. Ask OMB if you are unsure.", expectedCount: 1, status: "correct" },
  { text: "HHS announced the rule; HHS will review comments.", expectedCount: 1, status: "correct" },
  {
    text: "The FAA will review your application. The Federal Aviation Administration (FAA) is responsible.",
    expectedCount: 1,
    status: "correct",
  },
  { text: "Ask the ESAC and the SQHUW before you file.", expectedCount: 2, status: "correct" },

  {
    text: "The Federal Aviation Administration (FAA) denied the request. The FAA explained why.",
    expectedCount: 0,
    status: "correct",
  },
  { text: "The FAA (Federal Aviation Administration) denied the request.", expectedCount: 0, status: "correct" },
  { text: "Your ATM card works at any bank.", expectedCount: 0, status: "correct" },
  { text: "The CIA and IBM were founded long ago.", expectedCount: 0, status: "correct" },
  { text: "Chapter IV covers appeals.", expectedCount: 0, status: "correct" },
  { text: "IMPORTANT NOTICE: read this before you apply.", expectedCount: 0, status: "correct" },
  { text: "NOTICE. This notice explains your rights.", expectedCount: 0, status: "correct" },
  { text: "Complete Form I-9 and the COVID-19 screening.", expectedCount: 0, status: "correct" },
  { text: "Call us between 9 AM and 5 PM.", expectedCount: 0, status: "correct" },
  { text: "Visit the U.S. Department of Labor website.", expectedCount: 0, status: "correct" },
  { text: "Send a PDF of your ID.", expectedCount: 0, status: "correct" },
  { text: "The US Postal Service delivers it.", expectedCount: 0, status: "correct" },
  { text: "Attach form SF86 to the request.", expectedCount: 0, status: "correct" },
  { text: "You must file the application within 30 days.", expectedCount: 0, status: "correct" },

  {
    text: "Contact the Social Security Administration, or SSA, for help.",
    expectedCount: 0,
    status: "known_limitation",
    reason: "A definition by apposition ('…, or SSA,') is not read; only the parenthesized forms count.",
  },
  {
    text: "Click HELP for more details.",
    expectedCount: 0,
    status: "known_limitation",
    reason: "An interface label written in capitals has an acronym's shape.",
  },
];
