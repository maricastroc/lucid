import type { ClauseTree } from "@/lucid/core/coverage/types";

const OVERVIEW =
  "Overview clause: it introduces the principle and points to the guidelines that follow, without stating a " +
  "guideline of its own that could be checked in a text.";

export const EN_CLAUSE_TREE: ClauseTree = {
  standard: "ISO 24495-1:2023",
  referenceName: "ISO 24495-1",
  transcription:
    "Section 5 (Guidelines) — the four principles and their 23 subclauses, 5.1 to 5.4. The numbering and the " +
    "parent structure were verified against ABNT NBR ISO 24495-1:2024, the identical Brazilian adoption of " +
    "ISO 24495-1:2023. The English titles below are Lucid's rendering and were NOT transcribed from the ISO " +
    "English text, which was not accessed; every node is therefore marked provisional. Sections 1 to 4 and " +
    "Annexes A and B are not in this tree, and their absence here does not claim they do not exist. " +
    "`exhaustive` stays false and no coverage share is published.",
  exhaustive: false,
  nodes: [
    {
      section: "5.1",
      title: "Guidelines for Principle 1: Readers get what they need (relevant)",
      parent: null,
      principleGroup: "relevant",
      provisional: true,
    },
    {
      section: "5.1.1",
      title: "Overview",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.1.2",
      title: "Identify the readers",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Who the reader is is not a property of the text. No rule reads, in a document, the population it " +
          "means to reach, and a text can name one audience and be written for another.",
      },
    },
    {
      section: "5.1.3",
      title: "Identify the readers' purpose",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "What the reader came to do lives in the reader, not in the document. The text does not carry the " +
          "question someone brought to it.",
      },
    },
    {
      section: "5.1.4",
      title: "Identify the context in which readers will read the document",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Where, when and under what pressure the document is read is a circumstance of use, and leaves no mark " +
          "in the text that a rule can read.",
      },
    },
    {
      section: "5.1.5",
      title: "Select the document type or types",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Whether the chosen format fits the reader's need can only be answered by comparing it with the " +
          "alternatives that were not written.",
      },
    },
    {
      section: "5.1.6",
      title: "Select the content that readers need",
      parent: "5.1",
      principleGroup: "relevant",
      provisional: true,
      instruments: ["checkBriefing"],
      limit: {
        kind: "partial",
        reason:
          "The briefing checks whether the expressions the author declared essential appear in the text. That " +
          "verifies the author's declaration, not the reader's need: if the declaration is wrong or incomplete, " +
          "the check passes anyway. The briefing is not a detector — it produces no finding and cites no clause.",
      },
    },
    {
      section: "5.2",
      title: "Guidelines for Principle 2: Readers can easily find what they need (findable)",
      parent: null,
      principleGroup: "findable",
      provisional: true,
    },
    {
      section: "5.2.1",
      title: "Overview",
      parent: "5.2",
      principleGroup: "findable",
      provisional: true,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.2.2",
      title: "Structure the document for readers",
      parent: "5.2",
      principleGroup: "findable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Paragraph segmentation is measured, against a threshold that is provisional for this locale. " +
          "Ordering the document by the reader's need is not: it takes knowing what the reader looks for first.",
      },
    },
    {
      section: "5.2.3",
      title: "Use information design techniques that help readers find information",
      parent: "5.2",
      principleGroup: "findable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "A series written as running text — markers, ordinal words or items after a colon — is detected " +
          "against a provisional number of items. Tables, emphasis, spacing and visual hierarchy do not reach the engine.",
      },
    },
    {
      section: "5.2.4",
      title: "Use headings to help readers predict what comes next",
      parent: "5.2",
      principleGroup: "findable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Heading length and level skips are measured; the length threshold is provisional for this locale. " +
          "Whether a heading anticipates what follows is a judgment of content, and it is not reached.",
      },
    },
    {
      section: "5.2.5",
      title: "Keep supplementary information separate",
      parent: "5.2",
      principleGroup: "findable",
      provisional: true,
      limit: {
        kind: "unbuilt",
        reason:
          "Reachable by text analysis: exceptions, provisos and notes embedded mid-sentence carry syntactic " +
          "markers. No detector has been built.",
      },
    },
    {
      section: "5.3",
      title: "Guidelines for Principle 3: Readers can easily understand what they find (understandable)",
      parent: null,
      principleGroup: "understandable",
      provisional: true,
    },
    {
      section: "5.3.1",
      title: "Overview",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.3.2",
      title: "Choose familiar words",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "An acronym used before it is spelled out is detected from its shape; common acronyms are excused by a " +
          "short declared list. Whether a word is familiar to this reader is not reached. A general English jargon glossary is deliberately not built — its recall would only " +
          "measure the list. The organization's vocabulary is declared by the organization and cites no clause.",
      },
    },
    {
      section: "5.3.3",
      title: "Write clear sentences",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Passive voice is detected from form (a form of “be” plus a past participle), with the agent read " +
          "from “by”. Verbs hidden in nouns are detected when a light verb meets a noun with a deverbal suffix; " +
          "a verb is named only for pairs attested one to one. A noun naming the reader, given an obligation " +
          "or a permission, is detected from a closed list of reader roles. Who does what, and whether the sentence is clear, takes reading.",
      },
    },
    {
      section: "5.3.4",
      title: "Write concise sentences",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "partial",
        reason:
          "Sentence length is measured against a provisional, configurable trigger: an interim reference " +
          "borrowed from GOV.UK (United Kingdom), since no US federal source sets a per-sentence number; it has " +
          "not been validated for American documents. The central guideline, one idea per sentence, is not verifiable — " +
          "counting ideas takes reading. Variation in length is not measured.",
      },
    },
    {
      section: "5.3.5",
      title: "Write clear and concise paragraphs",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "unbuilt",
        reason:
          "One paragraph, one topic, with the topic stated first, is reachable by text analysis at least in part. " +
          "No detector cites this clause: `paragraph_length` counts sentences and is declared under 5.2.2.",
      },
    },
    {
      section: "5.3.6",
      title: "Consider including images and multimedia",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Whether an image would help, and whether the one present supports the text, is not decided from the " +
          "text. The engine audits text and does not see the image.",
      },
    },
    {
      section: "5.3.7",
      title: "Use a respectful tone",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "unbuilt",
        reason:
          "Part of it is lexical — terms that stereotype or exclude fit in a curated lexicon. Nothing has been " +
          "built. The tone of a document as a whole is not lexical and would not be reached by a lexicon.",
      },
    },
    {
      section: "5.3.8",
      title: "Make sure the document is cohesive",
      parent: "5.3",
      principleGroup: "understandable",
      provisional: true,
      limit: {
        kind: "unbuilt",
        reason:
          "Reachable in part: surface cohesion is measured in pt-BR. en-US declares no cohesion battery in " +
          "scenario A, so nothing is measured here — and nothing is shown as zero.",
      },
    },
    {
      section: "5.4",
      title: "Guidelines for Principle 4: Readers can easily use the information (usable)",
      parent: null,
      principleGroup: "usable",
      provisional: true,
    },
    {
      section: "5.4.1",
      title: "Overview",
      parent: "5.4",
      principleGroup: "usable",
      provisional: true,
      limit: { kind: "out_of_reach", reason: OVERVIEW },
    },
    {
      section: "5.4.2",
      title: "Evaluate the document continuously as it is developed",
      parent: "5.4",
      principleGroup: "usable",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "It is a process practice, not a property of the text. A document does not record whether it was " +
          "evaluated while it was being written.",
      },
    },
    {
      section: "5.4.3",
      title: "Evaluate the document afterwards with readers",
      parent: "5.4",
      principleGroup: "usable",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "Whether readers can use the information is measured by testing with readers. No property of the text " +
          "proves use, and no future detector reaches it: a text can pass every criterion and still not let " +
          "someone do what they need to do.",
      },
    },
    {
      section: "5.4.4",
      title: "Evaluate how readers use the document on an ongoing basis",
      parent: "5.4",
      principleGroup: "usable",
      provisional: true,
      limit: {
        kind: "out_of_reach",
        reason:
          "It depends on observing the document in use after it is published. It is beyond the reach of any " +
          "analysis of the text.",
      },
    },
  ],
};
