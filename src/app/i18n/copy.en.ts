import type { UiCopy } from "./copy";

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export const COPY_EN: UiCopy = {
  common: {
    close: "Close",
    cancel: "Cancel",
    restore: "Reset",
    add: "Add",
    remove: "remove",
    copy: "Copy",
    copied: "Copied",
    words: "words",
    engineOutputSuffix: " · pt-BR",
  },

  language: {
    ariaLabel: "Interface language",
    short: { "pt-BR": "PT", en: "EN" },
    switchTo: { "pt-BR": "Mudar a interface para português", en: "Switch the interface to English" },
  },

  masthead: {
    home: "Back to start",
    tagline: "Plain language auditor",
    openDocument: "Open document",
    opening: "Opening…",
    evaluation: "Evaluation",
    workMode: "Working mode",
    review: "Review",
    write: "Write",
    darkTheme: "Switch to dark theme",
    lightTheme: "Switch to light theme",
  },

  welcome: {
    regionLabel: "Introducing Lucid",
    kicker: "Plain Language auditor",
    titleLead: "Lucid audits your text for clarity.",
    titleTrail: "It does not rewrite it for you.",
    lead:
      "It checks every passage against the Plain Language principles of the ABNT/ISO standard: it shows what stops " +
      "the reader, cites the criterion that fired, and explains why.",
    leadStrong: "The final word is always yours.",
    doesLabel: "What it does",
    verbs: ["Analyzes", "Detects", "Explains", "Asks", "Verifies"],
    doesNotBefore: "What it does ",
    doesNotStrong: "not",
    doesNotAfter: " do: write the text for you.",
    write: "Write or paste text",
    loadExample: "Load example",
    anatomyLabel: "Every passage becomes an annotation like this",
    cardCriterion: {
      title: "The criterion that fired",
      body: "Passive voice, jargon, long sentence, nominalization — each tied to a principle of the standard.",
    },
    cardWhy: {
      title: "Why it stops the reader",
      body: "The engine's justification, and the exact passage marked in the document.",
    },
    cardWhat: {
      title: "What to do about it",
      body: "An honest call on who resolves it.",
    },
    outcomeSafe: "Direct swap available",
    outcomeHuman: "Your call",
    footerDeterministic: "100% deterministic analysis",
    footerSameInput: "Same text, same result",
    footerNoCloud: "No cloud, no automatic rewriting",
  },

  studio: {
    goHome: {
      title: "Back to start?",
      body: "The text under review and the trail of changes will be discarded. This cannot be undone — export the report first if you want to keep the audit.",
      confirm: "Discard and go back",
    },
    spliceRefused: {
      crosses_units: "This change spans more than one block of the imported document.",
      unsupported_unit: "Applying a multi-line change inside a heading or a list item is not supported yet.",
      introduces_heading: "This change would create a new heading, altering the document's outline.",
      empty_unit: "This change would leave the block empty.",
      rebuild_mismatch: "The document could not be rebuilt while preserving the other blocks.",
    },
    spliceRefusedKept: "The document is unchanged — nothing was applied.",
    spliceAcceptPlain: "Apply as plain text",
    spliceDiscard: "Discard",
    saveFailed:
      "This work could not be saved in the browser — it will be lost if you close the tab. Export the report so you " +
      "do not depend on it.",
    importRefusal: {
      unreadable: "The file could not be read. Check that it is a valid .docx.",
      tracked_changes:
        "This file has tracked changes that were never resolved. While they are there, the file itself does " +
        "not say what its text is — auditing it would mean auditing a version nobody approved. Accept or " +
        "reject the changes in your editor and import it again.",
      scanned:
        "This PDF is a scan, not text. There is nothing to audit in something that was never written as text — send the original, as .docx or as a PDF produced by a computer.",
      columns:
        "This PDF is set in two or more columns, and reading it top to bottom would interleave them. Rather than audit a scrambled text, the import stops here — send the original as .docx, or a single-column PDF.",
      glued:
        "The words of this PDF come out glued together: the text read is not the text written, and auditing it would measure the extraction, not the writing.",
      invariant:
        "A number in the PDF did not survive the reading. The tool would rather refuse than audit a text it cannot vouch for.",
      no_readable_content:
        "This file has no readable content to audit. That is not a clean document: it is an empty one.",
    },
    revisions: (n) => `${n} ${plural(n, "revision", "revisions")}`,
    changeApplied: "Change applied to the text.",
    undo: "Undo",
  },

  panel: {
    navLabel: "Panel sections",
    sections: {
      summary: "Summary",
      findings: "Points",
      settings: "Settings",
      metrics: "Metrics",
      probe: "Comprehension",
    },
    settingsTitle: "Customize analysis",
    settingsLead: "Tune the criteria to the rules of the document or of your organization.",
    settingsSummaryExpressions: (n) => (n === 0 ? "no expressions" : `${n} ${plural(n, "expression", "expressions")}`),
    settingsSummaryProfile: (deviations) =>
      deviations === 0 ? "default limits" : `${deviations} ${plural(deviations, "changed limit", "changed limits")}`,
    settingsSummaryJoin: " · ",
    settingsRecordPointer:
      "Information about the reader and the purpose of the document lives under Export › Report information.",
    settingsIsoNote: "Based on ABNT NBR ISO 24495-1",
    settingsIsoTitle:
      "This section helps apply the section 5.1 guidance on relevance to the reader. The remaining limits " +
      "correspond to the sentence, paragraph and heading criteria.",
    goToFindings: "View audit points",
    goToFindingsHint: "These settings are not audit points, but they change how some points are identified.",
    metricsSummary: (words, perSentence) => `${words} words · ${perSentence} per sentence`,
    probeSummary: "optional AI test",
    exportLabel: "Export",
    exportMenuLabel: "Export formats",
    provenanceTitle: (configHash, version) => `config ${configHash} · lucid ${version}`,
  },

  overview: {
    annotations: (n) => plural(n, "point to review", "points to review"),
    adjustedProfileBefore: "Score produced with an ",
    adjustedProfileStrong: "adjusted profile",
    adjustedProfile: (deviations, disabled) =>
      `${deviations} ${plural(deviations, "deviation", "deviations")} from the default` +
      (disabled > 0 ? `, ${disabled} ${plural(disabled, "criterion switched off", "criteria switched off")}` : ""),
    adjustedProfileAfter: "It is not comparable to a default score.",
    splitAriaLabel: (safe, human) => `${safe} direct swaps, ${human} require a human decision`,
    legendSafe: "direct swap available",
    legendHuman: "author's decision",
    exportAudit: "Download audit (.md)",
    printAudit: "Print audit (PDF)",
    printNote: "Opens the browser's print dialog — choose “Save as PDF”.",
    exportDocx: "Download revised text (.docx)",
    exportTxt: "Download text (.txt)",
    docxError: "The .docx could not be generated. Use the .txt export instead.",
    docxNote: "Contains the revised text, without the original formatting: bold, tables, images and headers.",
    importTables: (n: number) => `${n} ${n === 1 ? "table flattened" : "tables flattened"}`,
    importTextBoxes: (n: number) => `${n} ${n === 1 ? "text box inlined" : "text boxes inlined"}`,
    importRuledRegions: (n: number) =>
      `${n} ${n === 1 ? "region drawn as a grid" : "regions drawn as a grid"} read as running text`,
    importFurniture: (n: number) =>
      `${n} repeated ${n === 1 ? "line" : "lines"} of header, footer or page number left out of the audit`,
    importDehyphenated: (n: number) => `${n} ${n === 1 ? "word" : "words"} rejoined across a line break`,
    importAnd: " and ",
    importAlso: ", ",
    importRecovered: (styles: string) =>
      `We recognised the headings in the file (${styles}). Without that, they would come in as ordinary paragraphs.`,
    importFlattened: (what: string) =>
      `${what} became paragraphs. The content is audited, but the original arrangement is not.`,
    importFromPdf: (what: string) =>
      `Reading the PDF: ${what}. A PDF declares no headings and no lists, so everything enters as a paragraph.`,
    structureMissing: { heading: "headings", list: "lists" } as Record<string, string>,
    structureMissingJoin: " or ",
    structureCaveat: (missing: string, count: number) =>
      `We found no ${missing} in this document, so ${count} ` +
      `${plural(count, "criterion", "criteria")} could not be assessed. ` +
      "To include them in the audit, upload a .docx with that structure, or use # for headings and " +
      "- for list items.",
    scoreCaveat:
      "The score summarizes the criteria that were assessed. It does not approve the document or guarantee " +
      "the text is clear.",
    readingLabel: "Reading metrics",
    readingCaveat:
      "Readability and cohesion indicators help with the review, but do not on their own decide whether the " +
      "text is clear.",
    trailLabel: "Recorded changes",
    trailWeight: (before, after, changes) =>
      `Audit weight ${before} → ${after} · ${changes} recorded ${plural(changes, "change", "changes")}`,
    trailCaveat:
      "This list shows only the changes applied from a point in the review. What you rewrite by hand in Write " +
      "changes the document without appearing here or in the exported report.",
    changeFrom: "from",
    changeTo: "to",
    changeExpand: "Show the full passage",
    changeCollapse: "Collapse the passage",
    entryLabel: "Text as it came in",
    entryShow: "Show the text as it came in",
    entryHide: "Hide the text as it came in",
    entrySize: (chars) => `${chars.toLocaleString("en-US")} ${plural(chars, "character", "characters")}`,
    entryNote:
      "A copy of the text as it entered this session, kept for consulting only. Lucid neither restores nor " +
      "applies anything from here.",
    entryStartingPoint: "It is the starting point of the weight reported above.",
    entryUnknown:
      "No entry text recorded for this document: the session was saved before Lucid began keeping this copy.",
    entryWrittenHere: "This document was written here — there is no entry text to compare against.",
    descriptor: "descriptor",
    metricWords: "Words",
    metricSentences: "Sentences",
    metricWordsPerSentence: "Words per sentence",
    metricReadability: "Readability",
    metricReferentialCohesion: "Referential cohesion",
    metricAdjacentGap: "Pairs without continuity",
    metricConnectives: "Connectives /100 words",
  },

  revisionList: {
    regionLabel: "Audit index",
    title: "Audit index",
    filterLabel: "Filter annotations",
    bucketAll: "All",
    bucketSafe: "Direct swap",
    bucketHuman: "Your call",
    empty: "No annotations fired.",
    emptyInFilter: "No annotations under this filter.",
    hideInDocument: "Hide highlights in the document",
    hideNamed: (label) => `Hide the “${label}” highlights in the document`,
    showInDocument: "Show highlights in the document",
    showNamed: (label) => `Show the “${label}” highlights in the document`,
    coverage: "Coverage",
    cleanCriteria: (n) => `${n} ${plural(n, "criterion checked, no occurrence", "criteria checked, no occurrence")}`,
    hiddenCriteria: (n) =>
      `${n} ${plural(n, "criterion with highlights hidden", "criteria with highlights hidden")} — still in the audit`,
    highlightsOff: "highlights hidden in the document",
    lexiconCaveat:
      "The criteria check for specific patterns. They help with the review, but do not replace the judgment of whoever wrote the text.",
    occurrences: (n) => `${n} ${plural(n, "occurrence", "occurrences")}`,
    distinct: (n) => `${n} distinct ${plural(n, "excerpt", "excerpts")}`,
    hiddenByFilter: (n) => `${n} outside the filter`,
    statePending: "Pending",
    stateSeen: "Seen",
    stateDismissed: "Dismissed",
    searchLabel: "Search the excerpts",
    searchPlaceholder: "Search excerpt…",
    showingAll: (n) => `${n} ${plural(n, "occurrence", "occurrences")}`,
    showingFiltered: (shown, total) => `${shown} of ${total} ${plural(total, "occurrence", "occurrences")}`,
    moreFilters: "More filters",
    fewerFilters: "Fewer filters",
    clearFilters: "clear filters",
    orderBySeverity: "by severity",
    orderByDocument: "by position",
    batchLabel: "In bulk",
    batchClear: (n) => `Clear the marks on these ${n}`,
    batchCaveat:
      "Marking as seen is one at a time on purpose: the mark only means something if someone looked. In bulk you can only clear.",
    clearGroupMarks: (n) => `Clear ${n} ${plural(n, "mark", "marks")}`,
    scopeOn: "Only this criterion",
    scopeOff: "All criteria",
    scopeHint: (n) =>
      `The list and the ‹ › navigation step through only the ${n} ${plural(n, "occurrence", "occurrences")} of this criterion.`,
    markSeen: "Mark as seen",
    markSeenHint: "Mark as seen — you looked at this occurrence",
    markSeenNamed: (excerpt) => `Mark “${excerpt}” as seen`,
    dismiss: "Dismiss",
    dismissHint: "Dismiss — you will not act on this occurrence",
    dismissNamed: (excerpt) => `Dismiss “${excerpt}”`,
    unmark: "Unmark",
    unmarkHint: "Unmark — back to pending",
    progress: (done, total) => `${done} of ${total} marked`,
    pendingCount: (n) => `${n} pending`,
    progressCaveat: "The author's own mark on their review — it does not change the score or approve the text.",
    progressTitle: (done, total) => `${done} of ${total} marked`,
    absenceCaveat: "No annotations is not a certificate of clarity — it is the coverage of the audit.",
  },

  badges: {
    safeShort: "Direct swap",
    safeLong: "Direct swap available",
    humanShort: "Your call",
    humanLong: "Requires a human decision",
  },

  note: {
    excerpt: "Passage",
    whatWeFound: "What we found",
    whyItMatters: "Why it affects clarity",
    understandCriterion: "Understand this criterion",
    excerptMore: "Show the full excerpt",
    excerptLess: "Collapse the excerpt",
    engineOutput: "Engine output · pt-BR",
    engineOutputHint:
      "The justification comes from the analysis engine, which audits Portuguese — it is not translated along with the interface.",
    navPrev: "Previous (k)",
    navNext: "Next (j)",
    navOf: "of",
    panelLabel: "Audit",
    crumbAll: "All criteria",
    crumbBackTo: (criterion) => `Back to the ${criterion} list`,
    backToList: "Back to list",
    footerDeterministic: "Deterministic analysis",

    safeHeader: "Direct swap · curated equivalent",
    safeTerm: "Term",
    safePlain: "Plain",
    safeEquivalent: "1:1 equivalent from the glossary",
    safeApply: (term: string) => `Replace with «${term}»`,
    safeApplyNote:
      "The swap is yours: the tool only vouches that this equivalent is 1:1 and context-free. Applied one at a time, and the engine re-audits the text afterwards.",
    safeNote:
      "The tool points to the equivalent; it does not alter the text. Make the swap under “Edit or paste my version” " +
      "below — the engine will re-audit the result.",

    humanHeader: "Requires a human decision",
    humanLead:
      "This point calls for reading the context. Review the passage and choose the change that best preserves the " +
      "original meaning.",
    humanLeadByCriterion: {
      long_sentence:
        "There is more than one way to split this sentence. Review the passage and choose the split that best " +
        "preserves the original meaning.",
    },
    howToProceed: "How to proceed",

    manualOpen: "Edit or paste my version",
    manualTitle: "Your version",
    manualUnitSentence: "this sentence",
    manualUnitParagraph: "this paragraph",
    manualEditAria: (unit) => `Edit ${unit}`,
    manualVerify: "Verify my version",
    manualVerifying: "Verifying…",
    manualNote:
      "Write or paste your version. When you apply it, it is saved as a draft and checked against the same " +
      "criteria used for the AI rewrite.",

    aiTitle: "AI rewrite",
    aiTarget: (unit) => `The AI will rewrite ${unit} highlighted in the document and verify the result.`,
    proposerManual: "your edit",
    aiRun: "Generate and verify",
    aiRunning: "Generating and verifying…",
    aiFailed: (message) => `Could not generate: ${message}`,
    aiFailedGeneric: "failed to generate the rewrite",
    aiNoProposal:
      "The model did not return a rewrite different from the passage — nothing to propose. The verifier does not " +
      "fabricate one; the decision remains yours.",

    verdictLabel: "The engine verified",
    verdictProofs: (passed, total) => `${passed}/${total} proofs`,
    verdictBlocked: "A proof failed — the tool does not vouch for this passage.",
    verdictClear: "No failure found in this passage.",
    verdictWords: "words",
    verdictMeasureNotApproval: "measurement, not approval",
    proofLabel: "Proof · deterministic",
    signalLabel: "Signal · heuristic (not a proof)",
    evaluatedExcerpt: "Passage evaluated",
    proposerTitle: "model + prompt version",
    applyStale: "Passage changed — generate again",
    applyBlocked: "Use as a draft anyway",
    apply: "Use as a draft",
    applyStaleNote:
      "The passage was edited after this version was generated. To avoid losing your edit, generate again before applying.",
    applyBlockedNote:
      "If you understand the reason above and still want it, apply it as a draft — the engine re-audits.",
    applyNote: "Review before using — applying it is your decision.",
  },

  guidance: {
    generic:
      "The tool flagged the construction, but the fix depends on your judgement — it does not rewrite on its own.",
    passivaSintetica:
      "The “se” hides who acts. If you want the agent to be explicit, rewrite with an overt subject (“a multa é " +
      "aplicada pelo órgão”, or “o órgão aplica a multa”). If the “se” is reflexive, ignore this — only you know which " +
      "case it is.",
    nominalizacaoEncadeada:
      "Find the verb hidden inside the noun and give the action back to it (“a verificação das informações” → " +
      "“verificar as informações”). Who performs the action — and which nominalization is worth undoing — is your call.",
    siglaSemExpansao:
      "The first time the acronym appears, write the full name followed by the acronym in parentheses — “Nome Por " +
      "Extenso (SIGLA)”. After that, use the acronym alone. The expansion is yours; the tool does not know it.",
    redundancia:
      "Cut the term that repeats the meaning of the other — the leaner form is in the justification above. Which of " +
      "the two to remove is your call.",
    perifraseInflada:
      "Replace the phrase with the equivalent lean form (in the justification). Just check that the government of what " +
      "follows still holds.",
    duplaNegacao:
      "Say directly what the double negative asserts — the direct form is in the justification. Confirm that the " +
      "nuance you intended is not lost.",
    maisQuePerfeito:
      "Prefer the compound form, which is clearer: “tinha feito” instead of “fizera”. The swap requires reconjugating " +
      "with the auxiliary — the final sentence is yours.",
    gerundismo:
      "Replace the chained gerund with the simple future or the present: “enviaremos” / “enviamos” instead of “vamos " +
      "estar enviando”.",
    adverbioMenteDenso:
      "Cut or replace some of the -mente adverbs (the Portuguese equivalent of English -ly) — the pile-up weighs the " +
      "reading down. Which ones to drop depends on the emphasis you want. (Discontinued criterion — see “Vague " +
      "adverbs”.)",
    adverbiosVagos:
      "Try reading the sentence without this adverb (“basicamente”, “efetivamente”, “realmente”…): if the meaning does " +
      "not change, it was only reinforcement and can go. Keeping or cutting is your call.",
    mesoclise:
      "Rewrite without the mesoclisis — a pronoun infixed inside the verb: “será feito” or “vai fazer” instead of " +
      "“far-se-á”. It changes the construction, so the final sentence is yours.",
    paragraphLength:
      "Break the paragraph into smaller blocks, one group of ideas at a time. Where to cut depends on how the text is " +
      "organized — your call.",
    proseEnumeration:
      "Turn the items embedded in the prose into a bulleted list — each one becomes easier to find. It is a formatting " +
      "decision, and it is yours.",
    saltoDeNivelTitulo:
      "The heading hierarchy skipped a level. Demote this heading to the level right below the previous one, or add " +
      "the missing intermediate heading — that keeps the outline and structural reading predictable.",
    longHeading:
      "Shorten the heading until it becomes a label the reader can use to locate the section — and if it closed like a " +
      "sentence, drop the period and reduce it to the essential tag. The cut is yours.",
    singleItemList:
      "A one-item list separates nothing: add the missing items, or fold the content back into running text. The " +
      "choice depends on the content — it is yours.",
    headingBodyMismatch:
      "Read the heading and the section together: does it anticipate what the reader will find here? If not, adjust " +
      "the heading, or confirm that the shared word only changed form (plural/singular) — the tool does not decide for " +
      "you.",
    jargon:
      "There is a simpler equivalent in the glossary, but the swap depends on what follows. Confirm the context is a " +
      "noun phrase (not a clause) before substituting.",

    nominalizationBaseVerb: (verb) => `Base verb: “${verb}”.`,
    nominalizationBody:
      "Rewrite with the verb directly (e.g. “fazer a análise” → “analisar”). An automatic swap would require " +
      "reconjugating the verb or adjusting the complement — steps only you should decide.",

    readerNamed: (noun) => `The text refers to “${noun}” in the third person. To close the distance, `,
    readerUnnamed: "The text refers to the reader in the third person. To close the distance, ",
    readerBodyStrong: "speak to the reader",
    readerBody:
      ": switch to “você deve…” or use the imperative (“apresente…”, “compareça…”). The tool does not make the swap " +
      "because changing person changes register — the choice is yours.",

    subordinationCount: (clauses) => `${clauses} subordinate clauses`,
    subordinationTrapped: " trapped in a single sentence. ",
    subordinationBody:
      "Split into shorter sentences, one idea at a time — the start of each subordinate clause is usually the natural " +
      "cut. The tool does not rewrite: deciding what becomes its own sentence, and reconjugating, is your call.",

    longSentenceLead: "The tool does not rewrite — it ",
    longSentenceLeadStrong: "measures the effort",
    longSentenceWithCuts: " the sentence demands, and ",
    longSentenceWithCutsStrong: "points below to where it comes apart",
    longSentenceWithCutsTail: ". Recomposing each side is your call.",
    longSentenceNoCuts: " the sentence demands. Where to split and how to recompose is your call.",
    statWords: "words",
    statOver: "over by",
    statTarget: "target",
    statTargetValue: (n) => `${n} sentences`,
    cutsAvailable: (n) => (n === 1 ? "1 possible cut" : `${n} possible cuts`),
    cutsInformationNotAction: "information, not action",
    cutLabel: (i, boundary) => `cut ${i} · ${boundary}`,
    cutsNote: "The tool points at the boundary; it does not split. The new sentence is yours.",
    boundarySemicolon: "semicolon",
    boundaryDash: "em dash",
    boundaryCommaConjunction: (marker) => `comma before “${marker}”`,

    passiveWithAgent:
      "The agent is in the text, so the information exists — reorder it into “who does → action → what” and " +
      "reconjugate the verb. The tool does not assemble the sentence: rewrite it below or ask the AI, and the engine " +
      "will verify the result.",
    passiveNoAgentLead: "The text does not say who performed the action.",
    passiveNoAgentBody:
      " Only you have that information — the tool neither invents it nor assembles the sentence for you. Answer below " +
      "and your answer becomes a ",
    passiveNoAgentStrong: "requirement",
    passiveNoAgentRequirement:
      ": it enters the briefing for the AI rewrite, and the engine demands that the final version (yours or the AI's) " +
      "name that agent.",
    scaffoldLead: "The tool identifies the roles in the text so you can assemble the active voice. It is ",
    scaffoldLeadStrong: "scaffolding, not the sentence",
    scaffoldLeadTail: " — check every field; the final version is yours.",
    scaffoldAgent: "Agent",
    scaffoldAgentHint: "becomes the subject",
    scaffoldAction: "Action",
    scaffoldActionHint: "becomes the verb",
    scaffoldPickVerb: "→ choose the verb",
    scaffoldObject: "Object",
    scaffoldObjectHint: "what underwent the action",
    scaffoldObjectPlaceholder: "you fill this in",
    scaffoldNote:
      "Structure identified · check it. The tool does not flip the sentence: reordering and reconjugating is writing — " +
      "and the one who writes is you (or the AI, which the engine then verifies).",
    agentQuestion: "Who performs this action?",
    agentPlaceholder: "e.g. a comissão",
    agentKeepImpersonal: "The agent should not be named (keep it impersonal)",
    agentRecordedKeep:
      "Recorded: keeping the construction impersonal is your decision. The briefing instructs the AI not to invent an " +
      "agent, and the verification does not demand the active voice.",
    agentRecorded: (agent) =>
      `Recorded as a requirement: the final version must name «${agent}». The tool does not assemble the sentence — it verifies whoever did.`,
  },

  briefing: {
    label: "Required words and expressions",
    chip: "Lucid looks for these",
    lead:
      "Add words or expressions that have to be found exactly as you write them. Lucid shows where each " +
      "one appears — or tells you when it finds none.",
    audienceLabel: "Who was this text written for?",
    audienceHint: "Whoever actually reads it, not whoever signs it.",
    audiencePlaceholder: "e.g. a citizen with no legal training applying for the benefit for the first time",
    purposeLabel: "What does that person need to do?",
    purposeHint: "The concrete action the text has to make possible.",
    purposePlaceholder: "e.g. find out whether they qualify and gather the documents in time",
    priorLabel: "What do they already know about it?",
    priorHint: "What can be assumed — and therefore what has to be explained.",
    priorPlaceholder: "e.g. knows the benefit exists; does not know the vocabulary of the process",
    mustFindLabel: "Which word or expression must appear?",
    mustFindHint: "Add one expression at a time. The search ignores upper and lower case, but not accents.",
    mustFindPlaceholder: "e.g. deadline to appeal",
    addExpression: "Add expression",
    presenceLabel: "Occurrences in the document",
    occurrences: (n) => `${n} ${plural(n, "occurrence", "occurrences")}`,
    notFound: "Not found",
    showOccurrences: (expression, n) =>
      `Show “${expression}” in the document — ${n} ${plural(n, "occurrence", "occurrences")}`,
    occurrencePosition: (index, total) => `${index} of ${total}`,
    occurrenceNav: (expression) => `Occurrences of “${expression}”`,
    prevOccurrence: (expression) => `Previous occurrence of “${expression}”`,
    nextOccurrence: (expression) => `Next occurrence of “${expression}”`,
    removeNamed: (expression) => `Remove “${expression}”`,
    literalCaveat:
      "Finding it does not guarantee the reader will understand; not finding it may only mean the text says " +
      "it another way. This list is yours and does not change the score.",
  },

  reportRecord: {
    menuItem: "Report information",
    menuNote: "Optional — goes into the exported report, not into the analysis.",
    title: "Report information",
    optionalTag: "Optional",
    lead:
      "Record who the text was written for, what that person needs to do after reading it, and what they " +
      "already know about the subject.",
    caveat:
      "Lucid keeps these answers in the exported report but does not check them: they are a record, not a measurement.",
    isoNote: "Based on ABNT NBR ISO 24495-1",
    isoTitle: "These questions help apply the section 5.1 guidance on relevance to the reader.",
    done: "Close",
  },

  startHere: {
    label: "Start here",
    volume: (total, criteria) =>
      `${total} ${plural(total, "occurrence", "occurrences")} across ${criteria} ${plural(criteria, "criterion", "criteria")}.`,
    lead: (hasSwaps) =>
      hasSwaps
        ? "Reading it all at once does not work. An order that does: the mechanical ones first, then one " +
          "criterion at a time."
        : "Reading it all at once does not work. There are no direct swaps to make here, so the order that " +
          "works is one criterion at a time.",
    safeStep: "Direct swaps",
    safeBody:
      "These carry a curated 1:1 equivalent. They are the quickest calls and they cut the volume — the swap is " +
      "yours to make, the tool only points at it.",
    safeAction: (n) => `See the ${n} direct ${plural(n, "swap", "swaps")}`,
    criterionStep: "One criterion at a time",
    criterionBody:
      "The same problem repeated takes the same frame of mind. Walking one whole criterion is less tiring than " +
      "switching criterion at every finding.",
    criterionAction: (label, n) => `Walk “${label}” (${n})`,
    caveat:
      "A suggested order, not a rule: the findings are the same in any sequence, and order never changes the score.",
  },

  profile: {
    label: "Analysis limits",
    defaults: "No limits changed.",
    adjustments: (n) => `${n} ${plural(n, "limit", "limits")} you changed.`,
    chip: "Changes what gets flagged",
    lead:
      "Adjust the limits of criteria such as sentence and paragraph length. They apply to this analysis and " +
      "are recorded in the report.",
    openAdjust: "Adjust limits",
    resetDefaults: "Back to defaults",
    thresholdsLabel: "Limits",
    policyLabel: "Active criteria",
    policyNote:
      "Criteria you turn off are not checked and do not appear in the results. Every one is recorded in the " +
      "report and can be turned back on.",
    deviationOff: (label) => `${label}: off (default: on)`,
    deviationOn: (label) => `${label}: on (default: off)`,
    deviationValue: (what, value, fallback) => `${what} ${value} (default: ${fallback})`,
    decrease: (label) => `Decrease ${label}`,
    increase: (label) => `Increase ${label}`,
    knobSentenceWarn: "Long sentence — warn above",
    knobSentenceError: "Long sentence — priority above",
    knobParagraph: "Long paragraph — above (sentences)",
    knobHeading: "Long heading — above (words)",
    knobSubordination: "Dense subordination — from (clauses)",
    knobChainedNominalization: "Chained nominalization — from",
    knobProseEnumeration: "Enumeration in prose — from (items)",
  },

  send: {
    always: "On continuing, the document will be sent to an external AI service.",
    found: (named: string) => `We found ${named} in the document.`,
    limit: "Review the content: other personal data may not be detected.",
    kinds: {
      cpf: (n: number) => `${n} ${n === 1 ? "CPF" : "CPFs"}`,
      cnpj: (n: number) => `${n} ${n === 1 ? "CNPJ" : "CNPJs"}`,
      email: (n: number) => `${n} ${n === 1 ? "e-mail address" : "e-mail addresses"}`,
    },
    join: ", ",
    lastJoin: " and ",
  },
  probe: {
    title: "Comprehension test",
    lead: "Check whether the answer the reader is after is really in the passage.",
    selectPrompt:
      "Select a passage in the document. The probe reads only the excerpt you choose — not the whole document.",
    excerptLabel: "Excerpt that will be sent",
    clearExcerpt: "clear",
    onlyThisExcerpt: "The probe answers only from what is in this excerpt.",
    excerptTooLong: (chars, max) =>
      `Excerpt with ${chars.toLocaleString("en-US")} characters — above the ${max.toLocaleString("en-US")} limit. Select a shorter passage.`,
    useBriefingPurpose: "Use what you defined as the reader's purpose:",
    questionLabel: "What does the reader need to find in the text?",
    questionPlaceholder: "e.g. When does the deadline start?",
    run: "Run comprehension test",
    httpFailure: (status) => `failed (HTTP ${status})`,
    running: "Testing…",
    staleWarning: "The text changed after this test — the result below is for the previous passage. Run it again.",
    stuck: "The answer was not found in the text.",
    excerpt: "passage:",
    extracted: "Answer found:",
    noFloorViolation: "The answer was found in the text.",
    loadLabel: "Reading load",
    caveat:
      "This test uses AI and can be wrong. Finding the answer does not guarantee the text is clear — only " +
      "testing with real readers confirms that.",
    operations: {
      resolver_referente_a_distancia: "resolve what a pronoun refers to, at a distance",
      integrar_entre_frases: "join information from more than one sentence",
      decodificar_termo_tecnico: "decode a technical term",
      inferir_agente_omitido: "infer an agent the text does not name",
      segurar_sujeito_longo: "hold a long subject before the verb",
      desfazer_negacao_aninhada: "undo a nested negation",
    },
  },

  documentView: {
    regionLabel: "Document under review",
    emptyDrop: "Or drag a .docx or .pdf here.",
    dropHere: "Drop to open",
    dropHint: "Takes .docx and .pdf",
    draft: "Draft",
    structured: "Structured document",
    underReview: "Document under review",
    textareaLabel: "Document text",
    emptyTitle: "Start your draft",
    emptyBody:
      "Write or paste your text. The audit runs in real time, criterion by criterion — without rewriting for you.",
    headingLevel: (level) => `Heading · level ${level}`,
    list: "List",
    orderedList: "Numbered list",
    listItems: (n) => (n === 1 ? " · 1 item" : ` · ${n} items`),
    segmentLabel: (label, text, severity) => `${label}: “${text}”. ${severity}.`,
    sheetLabel: "Revisions",
    sheetClose: "Close",
    sheetCollapse: "Collapse",
  },

  taxonomy: {
    severity: { info: "Note", warning: "Warning", error: "Priority" },
    principleGroup: {
      relevant: "Relevant",
      findable: "Findable",
      understandable: "Understandable",
      usable: "Usable",
    },
    coverage: { curated: "curated", productive: "productive" },
    editorialExtension: "PT-BR editorial extension",
    editorialExtensionTag: "PT-BR",
    editorialExtensionTitle: "PT-BR editorial extension — outside the ISO standard",
    structuralHeuristic: "Structural heuristic",
    structuralHeuristicTag: "struct.",
    structuralHeuristicTitle: "Structural heuristic — outside the ISO standard",
  },

  ledger: {
    manual: "Author's edit",
    ai: "AI rewrite",
    glossary: "Direct swap from the glossary",
  },

  readability: {
    noMeasure: "no measurement",
    noWords: "There are no words to measure — no value was computed (this is not zero).",
    noSentences: "There is no delimited sentence to measure — no value was computed (this is not zero).",
    smallSample: (words, threshold) =>
      `Small sample: ${words} ${plural(words, "word", "words")}. The formula is calibrated for running text; below ` +
      `${threshold} words a single word moves the index by tens of points.`,
    sentenceBoundaryMissing: (wordsPerSentence, threshold) =>
      `${wordsPerSentence} words per sentence, above the plausible maximum of ${threshold}: segmentation found no ` +
      "sentence boundary — punctuation is probably missing in the pasted text.",
    syllablesImpossible: (syllablesPerWord, threshold) =>
      `${syllablesPerWord} syllables per word, above the plausible maximum of ${threshold}: the longest word in ` +
      "Portuguese has 18 syllables, so there is a token that is not a word of the language.",
    bandLabel: {
      very_easy: "very easy",
      easy: "easy",
      hard: "hard",
      very_hard: "very hard",
    },
    band: (label, min, max) => `${label} band (${min}–${max})`,
    inRange: (range) => `within the reference interval (${range})`,
    aboveRange: (range) => `above the reference interval (${range})`,
    belowRange: (range) => `below the reference interval (${range})`,
  },
};
