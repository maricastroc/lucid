import type { EnGoldenEntry } from "./measure";

export const HIDDEN_VERB_UNIVERSE =
  "Productive half only: a light verb (achieve, effect, give, have, make, reach, take, carry out, undertake, gain, " +
  "conduct, perform; 'have' only when a preposition follows the noun) followed, within one determiner and at most " +
  "one modifier, by a noun ending in -tion, -sion, -ment, -ance or -ence. Findings count when the suffix rule fired " +
  "(meta.productive). Hidden verbs outside that shape are listed as out_of_universe and are not counted.";

export const GOLDEN_HIDDEN_VERB_EN: readonly EnGoldenEntry[] = [
  { text: "We will make a decision within 30 days.", expectedCount: 1, status: "correct" },
  { text: "The agency made a determination on your claim.", expectedCount: 1, status: "correct" },
  { text: "Please make an application for a personal loan.", expectedCount: 1, status: "correct" },
  { text: "We need to conduct an investigation of the complaint.", expectedCount: 1, status: "correct" },
  { text: "The board will give consideration to your request.", expectedCount: 1, status: "correct" },
  { text: "The panel reached a conclusion last week.", expectedCount: 1, status: "correct" },
  { text: "Staff performed an assessment of the site.", expectedCount: 1, status: "correct" },
  { text: "If you cannot make the payment of the $100 fee, call us.", expectedCount: 1, status: "correct" },
  { text: "This means we must undertake the calculation of new figures.", expectedCount: 1, status: "correct" },
  { text: "The committee took action on the proposal.", expectedCount: 1, status: "correct" },
  { text: "The agency will make an announcement tomorrow.", expectedCount: 1, status: "correct" },
  { text: "We have made an adjustment to your account.", expectedCount: 1, status: "correct" },
  { text: "The inspector carried out an inspection of the building.", expectedCount: 1, status: "correct" },
  { text: "The owner must give notification to the tenant.", expectedCount: 1, status: "correct" },
  { text: "We achieved compliance with the rule.", expectedCount: 1, status: "correct" },
  { text: "The committee will have a discussion about the budget.", expectedCount: 1, status: "correct" },
  { text: "Make a submission by May 1.", expectedCount: 1, status: "correct" },
  { text: "We will make a final decision next week.", expectedCount: 1, status: "correct" },
  { text: "Applicants must make payments online.", expectedCount: 1, status: "correct" },
  { text: "The court gave an explanation of the ruling.", expectedCount: 1, status: "correct" },
  { text: "She made a suggestion at the meeting.", expectedCount: 1, status: "correct" },
  { text: "The contractor will effect a settlement with the city.", expectedCount: 1, status: "correct" },
  { text: "Please make a reservation early.", expectedCount: 1, status: "correct" },

  { text: "The train left the station.", expectedCount: 0, status: "correct" },
  { text: "Take the first position in line.", expectedCount: 0, status: "correct" },
  { text: "We made a difference in the community.", expectedCount: 0, status: "correct" },
  { text: "Make an appointment with your doctor.", expectedCount: 0, status: "correct" },
  { text: "You must provide the documents.", expectedCount: 0, status: "correct" },
  { text: "Take your medication daily.", expectedCount: 0, status: "correct" },
  { text: "We have the information you need.", expectedCount: 0, status: "correct" },
  { text: "Please make sense of the rules.", expectedCount: 0, status: "correct" },
  { text: "The decision was fair.", expectedCount: 0, status: "correct" },
  { text: "Give the form to the clerk.", expectedCount: 0, status: "correct" },
  { text: "We take pride in our service.", expectedCount: 0, status: "correct" },
  { text: "They reached the destination.", expectedCount: 0, status: "correct" },
  { text: "The payment is due.", expectedCount: 0, status: "correct" },
  { text: "He has an appointment today.", expectedCount: 0, status: "correct" },
  { text: "Make sure you sign the application.", expectedCount: 0, status: "correct" },
  { text: "We will review the application.", expectedCount: 0, status: "correct" },
  { text: "The agency has a mission to serve the public.", expectedCount: 0, status: "correct" },
  { text: "Make advance payments by check.", expectedCount: 1, status: "correct" },
  { text: "The rule gives the impression of strictness.", expectedCount: 0, status: "correct" },
  { text: "If you have an application pending, call us.", expectedCount: 0, status: "correct" },
  { text: "We make regulations every year.", expectedCount: 0, status: "correct" },

  {
    text: "Take the application to the front desk.",
    expectedCount: 0,
    status: "known_limitation",
    reason: "A light verb in its physical sense ('take the application to the desk') is read as a hidden verb.",
  },
  {
    text: "The school gave a performance of the play.",
    expectedCount: 0,
    status: "known_limitation",
    reason:
      "The suffix does not prove the noun names the action of the sentence; 'a performance of the play' is an event.",
  },
  {
    text: "We will give you an extension.",
    expectedCount: 1,
    status: "known_limitation",
    reason: "An indirect object between the light verb and the noun breaks the adjacency the rule reads.",
  },

  {
    text: "The production of accurate statistics is important.",
    expectedCount: 1,
    status: "out_of_universe",
    reason: "No light verb: the 'the ... of' pattern named by the guidelines is not detected.",
  },
  {
    text: "They gave approval to the plan.",
    expectedCount: 1,
    status: "out_of_universe",
    reason: "The suffix -al is outside the productive rule.",
  },
  {
    text: "A decision was made yesterday.",
    expectedCount: 1,
    status: "out_of_universe",
    reason: "The light verb follows the noun (passive order); the rule reads light verb first.",
  },
  {
    text: "We need to carry out a review of the accounts.",
    expectedCount: 1,
    status: "out_of_universe",
    reason: "'review' has no deverbal suffix: this pair is found by the curated half, which the suite does not count.",
  },
];
