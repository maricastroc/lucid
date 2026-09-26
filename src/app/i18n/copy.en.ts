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
  },

  language: {
    ariaLabel: "Interface language",
    short: { "pt-BR": "PT", en: "EN" },
    switchTo: { "pt-BR": "Mudar a interface para português", en: "Switch the interface to English" },
  },

  masthead: {
    home: "Back to start",
    tagline: "Deterministic text auditor",
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
    kicker: "Same text, same diagnosis",
    titleLead: "Lucid audits your text, criterion by criterion.",
    titleTrail: "It does not decide for you.",
    lead:
      "Each finding shows the exact passage, the criterion that flagged it and the source behind that criterion, " +
      "such as the ABNT NBR ISO 24495-1 standard. It also explains why the passage may get in the reader's way.",
    leadStrong: "An AI proposal only reaches your document if you apply it.",
    doesLabel: "What it does",
    verbs: ["Analyzes", "Detects", "Explains", "Asks", "Verifies"],
    doesNotBefore: "What it does ",
    doesNotStrong: "not",
    doesNotAfter: " do: approve your text.",
    write: "Write or paste text",
    loadExample: "Load example",
    anatomyLabel: "Each flagged passage gets an annotation like this",
    cardCriterion: {
      title: "The criterion that fired",
      body: "Passive voice, jargon, long sentence, actions written as nouns: each one comes with its source.",
    },
    cardWhy: {
      title: "Why it may stop the reader",
      body: "Lucid's justification, with the exact passage marked in the document.",
    },
    cardWhat: {
      title: "What to do about it",
      body: "Whether a direct swap is available, or the decision is yours.",
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
      body:
        "The text under review and its recorded changes will be discarded, and this cannot be undone. To keep the " +
        "audit, export the report first.",
      confirm: "Discard and go back",
    },
    replaceDocument: {
      title: "Open another document?",
      lead: "An audit is in progress. Opening another document replaces it, and you will lose:",
      changes: (n) => `${n} recorded ${plural(n, "change", "changes")}`,
      reviewed: (n) => `${n} reviewed ${plural(n, "point", "points")}`,
      dismissed: (n) => `${n} dismissed ${plural(n, "point", "points")}`,
      editedText: "the edits made to the text since it was opened",
      briefing: "the required expressions and report information you filled in",
      kept: "The editorial profile and the organisation's vocabulary stay: they belong to your organisation, not to this document.",
      save: "Save starting point…",
      saveHint:
        "Downloads this audit as a file before the other document opens, so you can compare the two versions later.",
      discard: "Discard and open",
      cancel: "Cancel opening",
    },
    spliceRefused: {
      crosses_units: "This change spans more than one block of the imported document.",
      crosses_cells: "This change spans more than one table cell, so applying it would move text between cells.",
      unsupported_unit: "Lucid cannot yet apply a change that spans several lines inside a heading or a list item.",
      introduces_heading: "This change would create a new heading and alter the document's outline.",
      rebuild_mismatch: "The document could not be rebuilt without altering its other blocks.",
    },
    spliceRefusedKept: "The document is unchanged: nothing was applied.",
    spliceAcceptPlain: "Apply as plain text",
    spliceDiscard: "Discard",
    saveFailed:
      "This work could not be saved in the browser and will be lost if you close the tab. Export the report to keep it.",
    importRefusal: {
      unreadable: "The file could not be read. Check that it is a valid .docx or .pdf file and try again.",
      tracked_changes:
        "This file has unresolved tracked changes, so it is not clear which version of the text to audit. Accept or " +
        "reject the changes in your editor, save the file and import it again.",
      scanned:
        "This PDF is a scanned image, not text, so there is nothing to audit. Import the original file as .docx, or " +
        "as a PDF exported from a word processor.",
      columns:
        "This PDF is laid out in two or more columns, and reading it top to bottom would mix them up. Import the " +
        "original as .docx, or as a single-column PDF.",
      glued:
        "The words in this PDF come out stuck together, so Lucid would be auditing the extraction, not your " +
        "writing. Import the original as .docx, or as a PDF exported from a word processor.",
      invariant:
        "A number in this PDF was lost when the text was extracted, so Lucid cannot rely on what it read. Import " +
        "the original as .docx.",
      no_readable_content:
        "This file has no readable text to audit: it is empty, not clean. Check that you opened the right file.",
    },
    openAudit: (pending) => (pending === 0 ? "Open the audit" : `Open the audit · ${pending} pending`),
    changeApplied: "Change applied to the text.",
    undo: "Undo",
  },

  panel: {
    navLabel: "Audit destinations",
    settingsTitle: "Customise analysis",
    settingsLead: "Adjust the criteria to the rules of this document or of your organisation.",
    settingsSummaryExpressions: (n) =>
      n === 0 ? "No expressions added" : `${n} ${plural(n, "expression added", "expressions added")}`,
    settingsSummaryProfile: (deviations) =>
      deviations === 0 ? "default limits" : `${deviations} ${plural(deviations, "changed limit", "changed limits")}`,
    settingsSummaryJoin: " · ",
    settingsRecordPointer: "To record who the reader is and what the document is for, use Export › Report information.",
    settingsIsoNote: "Reference: ABNT NBR ISO 24495-1",
    settingsIsoTitle:
      "The required expressions help apply section 5.1 of the standard, on relevance to the reader. The limits " +
      "are Lucid's own: the standard sets no numbers.",
    settingsOpen: "Configure the analysis",
    settingsClose: "Back to the audit",
    settingsDone: "Apply and go back",
    goToFindingsHint:
      "These settings are not findings. They are the limits and vocabulary Lucid uses to find points, and " +
      "changing them runs the analysis again.",
    exportLabel: "Export",
    exportMenuLabel: "Export formats",
    provenanceTitle: (configHash, version) => `config ${configHash} · lucid ${version}`,
  },

  overview: {
    foundLabel: "What the audit found",
    movedLabel: "What has changed",
    seeChanges: "See the changes",
    limitsLabel: "Limits of this analysis",
    experimentalLimit: (name) =>
      `Analysis in ${name} is experimental: it has not been validated on an independent corpus, and it has no ` +
      "readability, cohesion or AI rewriting.",
    annotations: (n) => plural(n, "point to review", "points to review"),
    adjustedProfileBefore: "This audit uses a ",
    adjustedProfileStrong: "custom profile",
    adjustedProfile: (deviations, disabled) =>
      `, with ${deviations} ${plural(deviations, "change", "changes")} from the default` +
      (disabled > 0
        ? `, including ${disabled} ${plural(disabled, "criterion switched off", "criteria switched off")}`
        : "") +
      ".",
    adjustedProfileAfter: "Its results are not comparable with an audit that uses the default profile.",
    splitAriaLabel: (safe, human) => `${safe} with a direct swap, ${human} for you to decide`,
    legendSafe: (n) => plural(n, "direct swap available", "direct swaps available"),
    legendHuman: (n) => plural(n, "point for you to decide", "points for you to decide"),
    severityCount: (severity, n) =>
      severity === "error"
        ? plural(n, "high priority", "high priority")
        : severity === "warning"
          ? plural(n, "needs attention", "need attention")
          : plural(n, "observation", "observations"),
    exportAudit: "Download audit (.md)",
    printAudit: "Print audit (PDF)",
    printNote: "Opens the browser's print dialog. Choose “Save as PDF”.",
    exportDocx: "Download revised text (.docx)",
    exportDocumentMd: "Download revised text (.md)",
    printDocument: "Print revised text",
    exportPdf: "Download revised text (.pdf)",
    exportPdfNote: "Laid out by Lucid on A4 pages, keeping headings, list levels and tables.",
    pdfPageLabel: (page: number, total: number) => `${page} of ${total}`,
    pdfError: "The PDF could not be generated. Download the .txt instead.",
    groupAudit: "Audit",
    groupDocument: "Revised text",
    exportTxt: "Download text (.txt)",
    docxError: "The .docx could not be generated. Download the .txt instead.",
    docxNote:
      "The PDF and the .docx share the same layout. They contain the revised text with its headings, lists and " +
      "tables, including merged cells. The rest of the original formatting is left out: bold, images, headers, " +
      "footers and brand fonts. Importing these files back into Lucid does not rebuild the same structure.",
    importTables: (n: number) => `${n} ${n === 1 ? "table" : "tables"}`,
    importTextBoxes: (n: number) => `${n} ${n === 1 ? "text box" : "text boxes"}`,
    importRuledRegions: (n: number) =>
      `${n} ${n === 1 ? "region" : "regions"} drawn as a grid but read as running text`,
    importPdfTables: (n: number) => `${n} ${n === 1 ? "table" : "tables"} rebuilt from the grid drawn in the file`,
    importFurniture: (n: number) =>
      `${n} repeated header, footer or page-number ${n === 1 ? "line" : "lines"} left out of the audit`,
    importDehyphenated: (n: number) => `${n} ${n === 1 ? "word" : "words"} rejoined across a line break`,
    importAnd: " and ",
    importAlso: ", ",
    importRecovered: (styles: string) =>
      `Headings were read from the file's styles (${styles}), so they keep their level instead of becoming ` +
      "ordinary paragraphs.",
    importInferred: (styles: string) =>
      `These headings were inferred from the style name (${styles}), because the file does not declare their ` +
      "level. Check that no ordinary paragraph was turned into a heading.",
    importFlattened: (what: string) =>
      `${what} became plain paragraphs. Their content is audited, but not their original layout.`,
    importFromPdf: (what: string) =>
      `How the PDF was read: ${what}. A PDF places characters on a page; it does not declare the document's ` +
      "structure.",
    importPdfInferred: (headings: number, items: number, references: string) =>
      `Lucid inferred ${headings} ${headings === 1 ? "heading" : "headings"} and ${items} ` +
      `${items === 1 ? "item" : "items"} in this PDF from Brazilian drafting rules (${references}) and from the ` +
      "size and position of the text on the page. The file itself only draws the text, so check them before " +
      "relying on them.",
    importPdfRuled:
      "Lucid rebuilds a table only where the file draws its grid: vertical lines mark the columns, horizontal " +
      "lines mark the rows, and a missing line marks a merged cell. Where no grid is drawn, no table is rebuilt, " +
      "because guessing cells from alignment could change what the text says.",
    structureMissing: { heading: "headings", list: "lists" } as Record<string, string>,
    structureMissingJoin: " or ",
    structureCaveat: (missing: string, count: number) =>
      `This document has no ${missing}, so ${count} ` +
      `${plural(count, "criterion", "criteria")} could not be checked. ` +
      `${plural(count, "To check it", "To check them")}, open a .docx that has ${missing}, or start headings ` +
      "with # and list items with -.",
    scoreCaveat:
      "The score summarises the criteria that were checked. It does not replace a full review or guarantee that " +
      "the text is clear.",
    readingLabel: "Reading metrics",
    readingCaveat:
      "Readability and cohesion indicators support the review, but on their own they do not show whether the " +
      "text is clear.",
    balanceWeightNoun: "in weight",
    balanceLabel: "Before and after",
    balanceNone: "No change has been recorded yet.",
    balanceTotal: (before, after) => `Audit weight: ${before} → ${after}`,
    balanceFound: (before, after) => `Points found: ${before} → ${after}`,
    balanceCount: (before, after) => `${before} → ${after}`,
    balanceDirection: { improved: "improved", regressed: "got worse", unchanged: "no change" },
    balanceKind: {
      resolved: "resolved",
      kept: "kept",
      reshaped: "rewritten, still flagged",
      introduced: "flagged after the change",
      transformed: "became something else",
      indirect: "knock-on effect",
    },
    balanceTransformed: (before, after) => `${before} became ${after}`,
    balanceIndirectNote:
      "Some counts changed outside the passage you edited. Heading criteria compare neighbouring blocks, so " +
      "editing one can change the result for the next.",
    balanceTypingNote:
      "For passages rewritten by hand, the comparison covers the whole edited region, so the occurrences inside " +
      "it cannot be matched one to one.",
    balanceCaveat:
      "Less weight does not mean the text is approved. This comparison only shows what the criteria found before " +
      "and after, not whether readers understood the text.",
    trailLabel: "Recorded changes",
    trailWeight: (before, after, changes) =>
      `Audit weight ${before} → ${after} · ${changes} recorded ${plural(changes, "change", "changes")}`,
    trailCaveat:
      "Text you type in Write is recorded too, as “Passage rewritten by hand”: one entry for each stretch of " +
      "typing, added when you leave the draft.",
    changeFrom: "from",
    changeTo: "to",
    changeExpand: "Show the full passage",
    changeCollapse: "Collapse the passage",
    entryLabel: "Original text",
    entryShow: "Show the original text",
    entryHide: "Hide the original text",
    entrySize: (chars) => `${chars.toLocaleString("en-US")} ${plural(chars, "character", "characters")}`,
    entryNote:
      "The text as it was when first opened, for reference only. Lucid does not restore it or apply changes " +
      "from it.",
    entryStartingPoint: "The starting weight above was measured on this text.",
    entryUnknown:
      "No original text was recorded for this document: the session was saved before Lucid started keeping this copy.",
    entryWrittenHere: "This document was written here, so there is no original text to compare against.",
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
    regionLabel: "Review",
    title: "Review",
    browseLabel: "Points by criterion",
    filterLabel: "Filter annotations",
    bucketAll: "All",
    bucketSafe: "With a direct swap",
    bucketHuman: "For you to decide",
    empty: "No criterion flagged anything in this text.",
    emptyFilterTitle: "No points match these filters",
    emptyFilterBody: (found) =>
      `The document still has ${found} ${found === 1 ? "point found" : "points found"}. ` +
      "Clear the filters to see them.",
    hideInDocument: "Hide highlights in the document",
    hideNamed: (label) => `Hide the “${label}” highlights in the document`,
    showInDocument: "Show highlights in the document",
    showNamed: (label) => `Show the “${label}” highlights in the document`,
    coverage: "Coverage of the analysis",
    cleanCriteria: (n) => `${n} ${plural(n, "criterion", "criteria")} checked with no points found`,
    hiddenCriteria: (n) =>
      `${n} ${plural(n, "criterion with highlights hidden", "criteria with highlights hidden")}, still counted in the audit`,
    highlightsOff: "highlights hidden in the document",
    lexiconCaveat:
      "The criteria look for specific patterns. They support your review but do not replace the author's judgement.",
    occurrences: (n) => `${n} ${plural(n, "point", "points")}`,
    distinct: (n) => `${n} distinct ${plural(n, "excerpt", "excerpts")}`,
    hiddenByFilter: (n) => `${n} outside the filter`,
    statePending: "Pending",
    stateSeen: "Reviewed",
    stateDismissedOne: "Dismissed",
    stateDismissed: "Dismissed",
    searchLabel: "Search the points",
    searchPlaceholder: "Search the points…",
    moreFilters: "More filters",
    fewerFilters: "Fewer filters",
    clearFilters: "clear filters",
    orderBySeverity: "by severity",
    orderByDocument: "by position",
    batchLabel: "In bulk",
    batchClear: (n) => `Clear the marks on these ${n} ${plural(n, "point", "points")}`,
    batchCaveat:
      "Points are marked as reviewed one at a time, on purpose: the mark only means something if someone looked. " +
      "In bulk, you can only clear marks.",
    clearGroupMarks: (n) => `Clear ${n} ${plural(n, "mark", "marks")}`,
    scopeOn: "Only this criterion",
    scopeOff: "All criteria",
    scopeHint: (n) =>
      `The list and the ‹ › arrows go through only the ${n} ${plural(n, "point", "points")} of this criterion.`,
    markSeen: "Mark as reviewed",
    markSeenHint: "Mark as reviewed: you have looked at this point",
    markSeenNamed: (excerpt) => `Mark “${excerpt}” as reviewed`,
    dismiss: "Dismiss",
    dismissHint: "Dismiss: you will not act on this point",
    dismissNamed: (excerpt) => `Dismiss “${excerpt}”`,
    unmark: "Unmark",
    unmarkHint: "Unmark: back to pending",
    progress: (done, total) => `${done} of ${total} reviewed`,
    pendingCount: (n) => `${n} pending`,
    progressCaveat:
      "These marks only help you keep track of your review. They do not change the audit result or approve the text.",
    progressTitle: (done, total) => `${done} of ${total} reviewed`,
    absenceCaveat:
      "No points found means none of the patterns Lucid looks for appeared. It does not mean the text is clear.",
    zeroCurated:
      "Checks a curated list. Zero means nothing on the list appeared, not that the text is free of the problem.",
    zeroProductive: "Detects the pattern directly in the text, without a list. Here, zero is a measurement.",
    zeroDeclared: (n: number) =>
      n === 0
        ? "Depends on the vocabulary you declare. No term is declared yet, so this zero measured nothing."
        : `Checks only the ${n} ${n === 1 ? "term" : "terms"} you declared.`,
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
    engineOutput: (locale) => `Analysis output · ${locale}`,
    engineOutputHint:
      "This justification is written in the analysis language. It is not translated with the interface.",
    navPrev: "Previous (k)",
    navNext: "Next (j)",
    navOf: "of",
    panelLabel: "Audit",
    crumbAll: "All criteria",
    crumbBackTo: (criterion) => `Back to the ${criterion} list`,
    backToList: "Back to list",
    footerDeterministic: "Automated analysis · reference standard:",

    safeHeader: "Direct swap · curated equivalent",

    declaredHeader: "Direct swap · equivalent declared by the organisation",

    declaredEquivalent: "equivalent recorded in your vocabulary",

    declaredApplyNote:
      "Your organisation vouches for this equivalent, not Lucid's glossary or the standard, and Lucid has not " +
      "checked its meaning in this sentence. The swap only happens if you click, one occurrence at a time, and " +
      "Lucid audits the text again afterwards.",
    safeTerm: "Term",
    safePlain: "Plain",
    safeEquivalent: "equivalent recorded in Lucid's glossary",
    safeApply: (term: string) => `Replace with «${term}»`,
    safeApplyNote:
      "Check that the meaning holds in this sentence before you apply it. The swap only happens if you click, " +
      "one occurrence at a time, and Lucid audits the text again afterwards.",
    safeNote:
      "The button above changes the text only when you click it. To adjust the rest of the sentence instead, " +
      "use “Edit or paste my version” below; Lucid audits the result again.",

    humanHeader: "Requires a human decision",
    humanLead:
      "This point depends on the context. Read the passage and decide whether to change it, and how, without " +
      "losing its meaning.",
    howToProceed: "How to proceed",

    manualOpen: "Edit or paste my version",
    manualTitle: "Your version",
    manualUnitSentence: "this sentence",
    manualUnitParagraph: "this paragraph",
    manualEditAria: (unit) => `Edit ${unit}`,
    manualVerify: "Verify my version",
    manualVerifying: "Verifying…",
    manualNote:
      "Write or paste your version, then verify it. Lucid runs the same checks it uses for AI proposals, and your " +
      "version only enters the text if you apply it.",

    aiUnavailableForLocale:
      "AI rewriting is not available for this analysis language yet: the checks that verify a proposal were " +
      "written for Portuguese. Edit the passage by hand, and Lucid will audit the document again.",
    manualApplyUnverified: "Apply edit",
    manualUnverifiedNote:
      "This analysis language has no rewrite checks yet. Your edit is applied without checking that numbers, " +
      "dates and the declared agent were kept, and Lucid then audits the document again.",
    aiTitle: "AI rewrite",
    aiTarget: (unit) =>
      `The AI will propose a new version of ${unit} (highlighted in the document), and Lucid will verify it.`,
    proposerManual: "your edit",
    aiRun: "Generate and verify",
    aiRunning: "Generating and verifying…",
    aiFailed: (message) => `Could not generate: ${message}`,
    aiFailedGeneric: "failed to generate the rewrite",
    aiErrorKind: {
      authentication:
        "The server could not authenticate with the model provider, so there is no proposal. The deterministic " +
        "audit is still complete.",
      quota:
        "The model provider's quota ran out, so there is no proposal now. The deterministic audit is still complete.",
      rate_limit: "The model provider asked to wait before another attempt. Try again in a moment.",
      model_unavailable: "The configured model is not available at the provider, so there is no proposal.",
      invalid_request: "The provider refused the configuration sent to the model, so there is no proposal.",
      incomplete: "The model stopped before finishing its answer, so there is no usable proposal. Nothing was applied.",
      empty: "The model answered with no content, so there is no proposal. Nothing was applied.",
      unusable:
        "The model did not return a usable proposal. Nothing was applied; try again or edit the passage yourself.",
      network: "Could not reach the model provider. Check the connection and try again.",
      server: "The model provider failed to answer. Try again in a moment.",
    },
    aiNoProposal:
      "The model returned nothing different from the passage, so there is no proposal. Lucid does not create " +
      "one; the decision stays with you.",

    verdictLabel: "Lucid's verification",
    verdictDivergent: "The original passage and the proposal diverge. Check before using it.",
    verdictEffect: "Lucid still flags problems in the rewritten passage.",
    verdictNoDivergence: "Lucid found no divergence in what it checks.",
    verdictWords: "words",
    verdictMeasureNotApproval: "measurement, not approval",
    groupNotConfirmed: "Not confirmed",
    groupAddition: "Addition to check",
    groupEffect: "Effect on the text",
    groupSignals: "Signals (not proofs)",
    groupConfirmed: "Confirmed",
    groupNotApplicable: "Does not apply",
    groupNotVerified: "Not verified",
    notVerifiedLead: "Lucid does not check",
    evaluatedExcerpt: "Passage evaluated",
    checksShow: (count) => `Show ${plural(count, "the other check", `the other ${count} checks`)}`,
    checksHide: "Hide the other checks",
    proposerTitle: "model + prompt version",
    applyStale: "Passage changed since this check",
    applyBlocked: "Use as a draft anyway",
    apply: "Use as a draft",
    applyStaleNote:
      "The passage was edited after this version was produced. Generate or verify it again before applying, so " +
      "your edit is not lost.",
    applyBlockedNote:
      "If you understand the reason above and still want this version, apply it as a draft. Lucid audits the " +
      "text again.",
    applyNote: "Read it before using it. Applying it is your decision.",
  },

  guidance: {
    generic: "Lucid flagged this construction. How to fix it depends on your judgement.",
    passivaSintetica:
      "The “se” hides who performs the action. To name the agent, rewrite with an explicit subject (“a multa é " +
      "aplicada pelo órgão” or “o órgão aplica a multa”). If the “se” is reflexive, ignore this point: only you " +
      "can tell which case it is.",
    nominalizacaoEncadeada:
      "To write the action as a verb, use the matching verb: “a verificação das informações” → “verificar as " +
      "informações”. Sometimes the verb needs someone to perform the action; if the text does not say who, that " +
      "information has to come from you. You do not need to change all of them. See which ones can be written more " +
      "directly.",
    siglaSemExpansao:
      "The first time the acronym appears, write the full name followed by the acronym in parentheses: “Nome Por " +
      "Extenso (SIGLA)”. After that, use the acronym alone. Lucid does not know what the acronym stands for, so " +
      "the full name has to come from you.",
    redundancia:
      "Cut the word that repeats the meaning of the other. If the justification records a leaner form, check " +
      "that it fits this sentence. You decide which word to remove.",
    perifraseInflada:
      "Replace the phrase with a leaner form. If the justification records one, check that the rest of the " +
      "sentence still fits with it.",
    duplaNegacao:
      "Say directly what the double negative means. If the justification records a direct form, check that it " +
      "keeps the nuance you intended.",
    maisQuePerfeito:
      "Prefer the compound form, which is clearer: “tinha feito” instead of “fizera”. The change requires " +
      "conjugating the auxiliary verb, so you write the final sentence.",
    gerundismo:
      "Replace the chained gerund with the simple future or the present: “enviaremos” or “enviamos” instead of " +
      "“vamos estar enviando”.",
    adverbioMenteDenso:
      "Cut or replace some of the -mente adverbs (the Portuguese equivalent of English -ly): piled up, they make " +
      "the sentence heavier. Which ones to drop depends on the emphasis you want. (This criterion has been " +
      "discontinued; see “Vague adverbs”.)",
    adverbiosVagos:
      "Read the sentence without this adverb (“basicamente”, “efetivamente”, “realmente”…). If the meaning stays " +
      "the same, the adverb was only emphasis and can go. You decide whether to keep it.",
    mesoclise:
      "Rewrite without the mesoclisis (a pronoun placed inside the verb): “será feito” or “vai fazer” instead of " +
      "“far-se-á”. This changes the construction, so you write the final sentence.",
    paragraphLength:
      "Break the paragraph into smaller blocks, one group of ideas each. Where to break it depends on how the " +
      "text is organised, so you decide.",
    proseEnumeration:
      "Turn the items listed in the prose into a bulleted list, so each one is easier to find. This is a " +
      "formatting decision, and it is yours.",
    saltoDeNivelTitulo:
      "The heading hierarchy skips a level. Move this heading to the level right below the previous one, or add " +
      "the missing heading in between, so the outline stays easy to follow.",
    longHeading:
      "Shorten the heading to a label the reader can use to find the section. If it ends like a sentence, drop " +
      "the period and keep only the essential words. You decide what to cut.",
    vocabularioDaOrganizacao:
      "This term is in the vocabulary your organisation declared, with no equivalent recorded, so Lucid can only " +
      "flag it. You decide whether it stays: sometimes the technical term is required, and what is missing is an " +
      "explanation the first time it appears.",
    singleItemList:
      "A list with one item separates nothing. Add the missing items, or fold the content back into the running " +
      "text. The choice depends on the content, so it is yours.",
    jargon:
      "Lucid has no safe replacement to suggest for this term here; the justification says why. If you replace " +
      "it, check that the new word keeps the meaning and fits the rest of the sentence. If the term has to stay, " +
      "explain it the first time it appears.",

    nominalizationBaseVerb: (verb) => `Verb registered in Lucid's list: “${verb}”.`,
    nominalizationBody:
      "To write it with the matching verb, conjugate the verb and adjust what follows, as in “fazer a análise” → " +
      "“analisar”. If the construction is clear as it is, mark the point as reviewed.",

    readerNamed: (noun) => `The text refers to “${noun}” in the third person. To close that distance, `,
    readerUnnamed: "The text refers to the reader in the third person. To close that distance, ",
    readerBodyStrong: "address the reader directly",
    readerBody:
      ": use “você deve…” or the imperative (“apresente…”, “compareça…”). Changing the person also changes the " +
      "tone of the text, so the choice is yours.",

    subordinationCount: (clauses) => `${clauses} subordinate clauses`,
    subordinationTrapped: " in a single sentence. ",
    subordinationBody:
      "Split it into shorter sentences, one idea each. A subordinate clause often starts where a cut could go. " +
      "You decide what becomes a separate sentence and how to adjust the verbs.",

    longSentenceLead: "Lucid ",
    longSentenceLeadStrong: "counts the words",
    longSentenceWithCuts: " in the sentence and ",
    longSentenceWithCutsStrong: "shows below where it could be split",
    longSentenceWithCutsTail: ", in case you decide it carries more than one idea.",
    longSentenceNoCuts: " in the sentence. Read it and decide whether it carries more than one idea.",
    statWords: "words",
    statTrigger: "trigger",
    statTriggerNote: "Lucid parameter",
    statTriggerNoteProvisional: "provisional",
    standardSaysLabel: "The standard asks for",
    standardSays: (standard) =>
      "concise sentences, one idea per sentence and varied length across the document, without setting a " +
      `number (${standard}, 5.3.4).`,
    parameterSaysLabel: "Lucid inspects",
    parameterSays: (threshold) =>
      `sentences above ${threshold} words. This number is Lucid's choice, and you can change it in the ` +
      "editorial profile. A sentence above it is not necessarily inadequate.",
    parameterSaysProvisional: (threshold) =>
      `sentences above ${threshold} words. This number is provisional for this analysis language and has not ` +
      "been validated. A sentence above it is not necessarily inadequate.",
    coOccurringLabel: "Other signals in this sentence",
    coOccurringNote: "Each one has its own criterion and justification. They do not add up to a score.",
    coOccurringNone:
      "Lucid found no other signal in this sentence. That does not mean it is clear, only that none of the " +
      "signals Lucid looks for appeared.",
    cutsAvailable: (n) => (n === 1 ? "1 possible boundary" : `${n} possible boundaries`),
    cutsInformationNotAction: "information, not action",
    cutLabel: (i, boundary) => `boundary ${i} · ${boundary}`,
    cutsNote:
      "Lucid shows where the sentence could be split. It does not split it, and it does not claim splitting is needed.",
    boundarySemicolon: "semicolon",
    boundaryDash: "em dash",
    boundaryCommaConjunction: (marker) => `comma before “${marker}”`,

    passiveWithAgent:
      "The text names who performs the action, so you can reorder the sentence as “who → action → what” and " +
      "adjust the verb. Rewrite it below or ask the AI, and Lucid will verify the result.",
    passiveNoAgentLead: "If the sentence doesn't say who performed the action, rewrite it to name them.",
    passiveNoAgentBody: " To have the AI write that version, enter the agent under ",
    passiveNoAgentRequirement: ", just below: without it, the AI would have to invent who acted.",
    scaffoldLead: "Lucid identifies the roles in the sentence to help you build the active voice. This is ",
    scaffoldLeadStrong: "scaffolding, not the sentence",
    scaffoldLeadTail: ": check each field. The final version is yours.",
    scaffoldAgent: "Agent",
    scaffoldAgentHint: "becomes the subject",
    scaffoldAction: "Action",
    scaffoldActionHint: "becomes the verb",
    scaffoldPickVerb: "→ choose the verb",
    scaffoldObject: "Object",
    scaffoldObjectHint: "what received the action",
    scaffoldObjectPlaceholder: "you fill this in",
    scaffoldNote:
      "Structure identified: check it. Lucid does not rearrange the sentence. Rewrite it yourself, or ask the AI " +
      "and Lucid will verify the proposal.",
    agentQuestion: "Who performs this action?",
    agentQuestionHint:
      "The AI will use your answer as the subject of the new version. If the sentence already says who acted, leave it blank.",
    agentPlaceholder: "e.g. a comissão",
    agentKeepImpersonal: "Do not name the agent (keep it impersonal)",
    agentRecordedKeep:
      "The sentence stays impersonal: the AI will not invent an agent, and the verification does not require " +
      "the active voice.",
    agentRecorded: (agent) =>
      `The AI will use «${agent}» as the one who performs the action, and Lucid checks that the new version, ` +
      "the AI's or yours, names it.",
  },

  vocabulary: {
    label: "The organisation's vocabulary",
    chip: "declared by you",
    lead:
      "Lucid's glossary is small on purpose: it only includes entries checked one by one, and it does not know " +
      "your organisation's own terms. Declare them here, and Lucid looks for them in every document you audit " +
      "with this vocabulary loaded.",
    fromSelection: "From the passage selected in the document:",
    useSelection: "Use this passage as the term",
    termLabel: "Term",
    termPlaceholder: "e.g. termo de fomento",
    plainLabel: "Plain equivalent",
    plainHint: "Leave blank if there is no safe swap. Without an equivalent, the term is only flagged.",
    plainPlaceholder: "e.g. acordo de repasse",
    reasonLabel: "Reason",
    reasonPlaceholder: "e.g. nobody outside the administration uses this phrase",
    add: "Declare term",
    duplicate: "This term is already declared.",
    declaredLabel: (n: number) => `${n} ${n === 1 ? "term declared" : "terms declared"}`,
    occurrences: (n: number) => `· ${n} ${n === 1 ? "occurrence" : "occurrences"}`,
    signalOnly: "No equivalent recorded: the term is only flagged.",
    swapsTo: (plain: string) => `Recorded equivalent: “${plain}”.`,
    remove: (term: string) => `Remove “${term}” from the vocabulary`,
    authorityCaveat:
      "These terms come from your organisation, not from the standard: they never cite a clause of ISO 24495-1, " +
      "and the report lists them apart from Lucid's glossary. The vocabulary is part of each run's stamp, so " +
      "every result shows which list was used.",
  },
  briefing: {
    label: "Required words and expressions",
    chip: "Lucid looks for these",
    lead:
      "Add words or expressions that must appear exactly as you write them. Lucid shows where each one appears, " +
      "or tells you it found none.",
    audienceLabel: "Who was this text written for?",
    audienceHint: "The person who will actually read it, not the one who signs it.",
    audiencePlaceholder: "e.g. a citizen with no legal training applying for the benefit for the first time",
    purposeLabel: "What does that person need to do?",
    purposeHint: "The concrete action the text has to make possible.",
    purposePlaceholder: "e.g. find out whether they qualify and gather the documents in time",
    priorLabel: "What do they already know about it?",
    priorHint: "What can be assumed, and therefore what needs explaining.",
    priorPlaceholder: "e.g. knows the benefit exists; does not know the vocabulary of the process",
    mustFindLabel: "Which word or expression must appear?",
    mustFindHint: "Add one expression at a time. The search ignores capitalisation but not accents.",
    mustFindPlaceholder: "e.g. deadline to appeal",
    addExpression: "Add expression",
    presenceLabel: "Occurrences in the document",
    occurrences: (n) => `${n} ${plural(n, "occurrence", "occurrences")}`,
    notFound: "Not found",
    showOccurrences: (expression, n) =>
      `Show “${expression}” in the document (${n} ${plural(n, "occurrence", "occurrences")})`,
    occurrencePosition: (index, total) => `${index} of ${total}`,
    occurrenceNav: (expression) => `Occurrences of “${expression}”`,
    prevOccurrence: (expression) => `Previous occurrence of “${expression}”`,
    nextOccurrence: (expression) => `Next occurrence of “${expression}”`,
    removeNamed: (expression) => `Remove “${expression}”`,
    literalCaveat:
      "Finding an expression does not mean the reader will understand it, and not finding it may only mean the " +
      "text says it another way. This list is yours and does not change the score.",
  },

  reportRecord: {
    menuItem: "Report information",
    menuNote: "Optional. Goes into the exported report, not into the analysis.",
    title: "Report information",
    optionalTag: "Optional",
    lead:
      "Record who the text was written for, what that person needs to do after reading it, and what they " +
      "already know about the subject.",
    caveat:
      "Lucid keeps these answers in the exported report but does not check them: they are a record, not a measurement.",
    isoNote: "Based on ABNT NBR ISO 24495-1, section 5.1",
    isoTitle: "These questions help apply the standard's guidance on relevance to the reader.",
    done: "Close",
  },

  views: {
    overview: {
      label: "Overview",
      purpose: "What the audit found in this text, and what to do next.",
    },
    review: {
      label: "Review",
      purpose: "Go through the points and decide what to do with each one.",
    },
    changes: {
      label: "Changes",
      purpose: "The recorded changes to the text, and the effect of each one on the criteria.",
    },
    metrics: {
      label: "Metrics",
      purpose: "Descriptive measures of the text. None of them is a score or an approval.",
    },
    probe: {
      label: "Comprehension",
      purpose: "Optional AI test. It never approves a text; it only shows where a reader may get stuck.",
    },
  },

  counts: {
    stripLabel: "Review state",
    found: (n) => `${n} ${plural(n, "point found", "points found")}`,
    pending: (n) => `${n} pending`,
    reviewed: (n) => `${n} reviewed`,
    dismissed: (n) => `${n} dismissed`,
    noun: {
      found: (n) => plural(n, "point found", "points found"),
      pending: () => "pending",
      pendingPoints: (n) => plural(n, "pending point", "pending points"),
      reviewed: () => "reviewed",
      dismissed: () => "dismissed",
      change: (n) => plural(n, "recorded change", "recorded changes"),
    },
    shown: (shown, found) => `Showing ${shown} of ${found} ${plural(found, "point", "points")}`,
    shownAll: (found) => `Showing ${plural(found, "the only point", `all ${found} points`)}`,
    stepsDone: (done, total) => `${done} of ${total} ${plural(total, "step done", "steps done")}`,
    nothingPending: "Nothing pending",
    resolvedSince: (resolved, introduced) =>
      introduced === 0
        ? `${resolved} ${plural(resolved, "point left the text", "points left the text")}`
        : `${resolved} ${plural(resolved, "point left", "points left")} · ` +
          `${introduced} ${plural(introduced, "new point appeared", "new points appeared")}`,
  },

  route: {
    label: "Path",
    tabsLabel: "How to review",
    tabRoute: "Guided path",
    tabBrowse: "All points",
    idleLead: (found, steps) =>
      `The path groups the ${found} ${plural(found, "point", "points")} into ${steps} ` +
      `${plural(steps, "step", "steps")}: one criterion at a time, most serious first.`,
    stepOf: (index, total) => `Step ${index} of ${total}`,
    begin: "Start the review",
    resume: "Continue the review",
    beginHint: (index, label) => `Starts at step ${index}: ${label}`,
    resumeHint: (index, label) => `You stopped at step ${index}: ${label}`,
    openStep: "Open the first point",
    resumeStep: "Pick up where you left off",
    stepPending: (n) =>
      n === 1
        ? "1 point pending in this step. Open it and mark it as reviewed or dismissed."
        : `${n} points pending in this step. Open each one and mark it as reviewed or dismissed.`,
    stepProgress: (reviewed, count) => `${reviewed} of ${count} ${plural(count, "point", "points")} in this step`,
    routeProgress: (reviewed, found) => `${reviewed} of ${found} ${plural(found, "point", "points")} on the path`,
    nextUp: (index, label) => `Next: step ${index} · ${label}`,
    advance: (index, label) => `Continue to step ${index}: ${label}`,
    finishedTitle: (label) => `Step done: ${label}`,
    finishedCount: (reviewed, dismissed) =>
      dismissed === 0
        ? `${reviewed} ${plural(reviewed, "point reviewed", "points reviewed")}`
        : `${reviewed} reviewed · ${dismissed} dismissed`,
    reviewAgain: "Go through this step again",
    allDoneTitle: "Path finished",
    allDoneCount: (reviewed, steps) =>
      `${reviewed} ${plural(reviewed, "point reviewed", "points reviewed")} across ${steps} ${plural(steps, "step", "steps")}.`,
    allDoneBody:
      "Finishing the path is not approval. A reviewed point is one you looked at; a resolved point is one that " +
      "left the text. The audit only changes when the text changes.",
    allDoneNext: "Your review is included in the exported audit (Export › Audit).",
    leave: "Leave the path",
    leaveDone: "Back to the overview",
    backToReview: "Go through the points again",
    stepsLabel: "Steps on the path",
    stepDone: "done",
    stepPartial: (reviewed, count) => `${reviewed} of ${count} reviewed`,
    startTag: "start here",
    resumeTag: "continue here",
    stepAction: (label, n) => `Go through “${label}” (${n} ${plural(n, "point", "points")})`,
    states: { "not-started": "not started", "in-progress": "in progress", done: "done" },
    orderCaveat:
      "This order is only a suggestion. You can take the steps in any order without changing the audit result.",
    swapShortcutLabel: "Shortcut",
    swapShortcut: (n) => `See the ${n} ${plural(n, "direct swap", "direct swaps")}`,
    browseLead: "Browse freely: filter and open any point. Nothing here changes the path.",
    browseReturn: (index, label) => `Back to the path · step ${index}: ${label}`,
  },

  guided: {
    trailLabel: "Steps on the path",
    trailStep: (index, total, label, state) => `Step ${index} of ${total}: ${label}, ${state}`,
    occurrenceOf: (index, total) => `Point ${index} of ${total}`,
    backToStep: "Back to the step",
    markAndAdvance: "Mark as reviewed and move on",
    markAndFinish: "Mark as reviewed and finish the step",
    seenChip: "Reviewed",
    nextOccurrence: "Next point",
    stepOccurrences: "Points in this step",
    stepProgressLabel: "Step progress",
    routeProgressLabel: "Path progress",
  },

  decision: {
    label: "Decision on record",
    kinds: { seen: "Reviewed", dismissed: "Dismissed" },
    fieldLabel: "Why this passage stays as it is",
    placeholder: "Why leave this passage as it is? (optional)",
    caveat:
      "This is your record, not a Lucid measurement: it does not change the score or the audit result. It goes " +
      "into the report as a human decision.",
    reportPointer: "It shows up in Export › Audit, under “Points examined and kept”.",
  },

  changes: {
    emptyTitle: "No changes yet",
    emptyBody:
      "When you apply a direct swap or a rewrite, or edit the text, each change shows up here with the before, " +
      "the after and its effect on the criteria.",
    listLabel: "Applied changes",
    effectLabel: "Effect on criteria",
    usedAnyway: "Used anyway, with these divergences",
    detailsShow: "See the details of this change",
    detailsHide: "Hide the details of this change",
    undoLast: "Undo this change",
    weightMeaning:
      "Weight adds up the severity of the points found (Priority 3, Warning 1, Note 0.3). It is used to compare " +
      "the text with itself, before and after a change. A smaller weight does not mean the text is approved: it " +
      "only reflects what the automatic criteria found, not whether readers understood the text.",
    stillOpen: (n) => `${n} ${plural(n, "point is still in the text", "points are still in the text")}`,
    none: "No criterion changed its count.",
  },

  baseline: {
    label: "Starting point",
    saveAction: "Save a starting point…",
    attachAction: "Attach a starting point",
    detach: "Detach",
    dialogTitle: "Save a starting point",
    dialogLead:
      "Saves this audit so you can compare it with a later version of the same document, even if the text is " +
      "rewritten outside Lucid.",
    titleLabel: "Document name",
    titleHint: "Required. It is the only name the file carries: Lucid does not keep the name of the file you opened.",
    titlePlaceholder: "e.g. Notice 04/2026, version sent to legal",
    fileNotice:
      "This file contains the whole document: the text, its structure, this audit and the reasons you recorded. " +
      "It stays on your computer and is not sent anywhere, but share it with the same care as the document itself.",
    save: "Save file",
    savedAt: (when) => `saved on ${when}`,
    emptyLead:
      "Attach a starting point saved from an earlier audit to compare this version with it, even if the text was " +
      "rewritten outside Lucid.",
    sameRuler:
      "Both versions are measured with the same ruler: the starting point's text was analysed again with the " +
      "Lucid version, profile and data in use now.",
    historical: (count) => `${count} ${plural(count, "point", "points")} in the saved audit`,
    rebased: (count) => `${count} ${plural(count, "point now", "points now")}, with the current ruler`,
    engineDrift: (delta) =>
      `${Math.abs(delta)} ${plural(Math.abs(delta), "point of that difference comes", "points of that difference come")} ` +
      "from changes in the ruler, not in the text.",
    divergenceLabel: "What has changed in the ruler since then",
    divergenceFields: {
      lucidVersion: "Lucid version",
      localeId: "language",
      configHash: "editorial profile",
      dataHash: "curated data",
      standardVersion: "standard version",
    },
    adoptProfile: "Adopt the starting point's profile",
    adoptProfileHint:
      "The comparison uses the current profile. Adopting the saved one runs the whole audit again with the " +
      "limits that applied back then.",
    stillThereLabel: "Raised before and still there",
    stillThereLead:
      "Passages the earlier audit raised that the current version raises again, word for word. This list does " +
      "not say that anything was resolved: it only shows what remained.",
    stillThereCount: (n) => `${n} ${plural(n, "point remains", "points remain")}`,
    stillThereNone: "None of the passages raised before appears again with the same words.",
    occurrences: (n) => `${n}×`,
    alreadyDecided: { seen: "already examined and kept", dismissed: "already dismissed" },
    noReason: "no reason on record",
    refusal: {
      unreadable:
        "This file is not a Lucid starting point, or it was changed after it was saved. Attach the file exactly " +
        "as Lucid saved it.",
      schema: "This starting point was saved in a format this version of Lucid cannot read.",
      locale:
        "This starting point was audited in a different analysis language, so it cannot be compared with this " +
        "audit. Attach one saved in the same analysis language.",
    },
    caveat:
      "When both versions were edited outside Lucid, it is not possible to tell which edit caused which change. " +
      "The numbers are counts from the same detectors on two texts, and a smaller weight is not approval.",
  },

  metricsView: {
    notAScore:
      "These measures describe the surface of the text. They help you read the criteria, but they do not replace " +
      "the author's judgement and they are not an approval.",
    tablesLabel: "Outside the averages",
    tablesApart: (tables, cells, words) =>
      `${tables} ${tables === 1 ? "table" : "tables"}, ${cells} ${cells === 1 ? "cell" : "cells"} and ` +
      `${words} ${words === 1 ? "word" : "words"} are left out of the figures above.`,
    tablesAudited:
      "A table cell is not a sentence: counting it as prose would lower words per sentence and shift readability " +
      "without the writing changing. The text in cells is still checked against every criterion.",
    explainShow: "What this measure means",
    explainHide: "Hide explanation",
    meaningLabel: "Measures",
    directionLabel: "Direction",
    limitLabel: "Limit",
    meanings: {
      words: {
        meaning: "How many words the text has after import.",
        direction: "Neither higher nor lower is better: it is just the size of what was analysed.",
        limit: "Counts words in the extracted text, not in the original file.",
      },
      sentences: {
        meaning: "How many sentences the segmenter found.",
        direction: "Neither higher nor lower is better.",
        limit: "Abbreviations and lists can change the count in very fragmented texts.",
      },
      wordsPerSentence: {
        meaning: "Average words per sentence.",
        direction:
          "A high average often comes with sentences that pack in several ideas. It is a signal, not a defect.",
        limit: "The average hides variation: very short and very long sentences can average out to a good number.",
      },
      readability: {
        meaning: "Flesch index adapted to Portuguese by Martins et al. (1996).",
        direction: "A higher value means a surface that is easier to decode.",
        limit: "A mechanical formula based on syllables and words: it does not consider meaning, order or structure.",
      },
      referentialCohesion: {
        meaning: "How often neighbouring sentences repeat the same nouns.",
        direction:
          "Descriptive: too much repetition is tiring; too little makes the reader guess what is being referred to.",
        limit: "It compares words, not meanings. Synonyms and pronouns do not count.",
      },
      adjacentGap: {
        meaning: "Share of neighbouring sentences with no word in common.",
        direction: "Descriptive: a high value points to jumps between sentences, which may or may not be intended.",
        limit: "It cannot tell a deliberate jump from an accidental one.",
      },
      connectives: {
        meaning: "Connectives per 100 words.",
        direction:
          "Descriptive: too many or too few can get in the way, and the right amount depends on the type of text.",
        limit: "Counted from a fixed list; it does not judge whether each connective is the right one.",
      },
    },
  },

  presets: {
    label: "What the text is for",
    lead:
      "These limits are Lucid's, not the standard's: ABNT NBR ISO 24495-1 sets no numbers. Choosing a purpose " +
      "switches to another declared set of limits, and scores are only comparable within the same set.",
    current: (name) => `In use: ${name}`,
    adjustedOn: (name, n) => `${name}, with ${n} of your own ${n === 1 ? "adjustment" : "adjustments"}`,
    stamp: (name, version, hash) => `${name} v${version} · ${hash}`,
    names: {
      base: "Default",
      normativo: "Normative or contractual",
      publico: "Leaflet and notice to the citizen",
      digital: "Service page and web content",
    },
    purposes: {
      base: "No declared purpose. Lucid's reference limits, the same for any text.",
      normativo:
        "Laws, decrees, tenders and contracts. Accepts longer sentences and paragraphs, because legal structure requires them, and still flags jargon, passive voice and actions written as nouns.",
      publico:
        "Written for people outside the field. Short sentences, short paragraphs, little subordination: the strictest profile of the set.",
      digital:
        "Read on a screen, skipping from part to part. Asks for short paragraphs and short headings, because people scan before they read.",
    },
    limits: {
      base: "Comparable with any other score that uses the default.",
      normativo:
        "Scores from this profile are not comparable with the default or with the other profiles: the same text shows fewer long sentences here because the limit is different.",
      publico:
        "Applied to legal text, this profile flags almost every sentence. That is not a flaw in the text or in the profile: it is the wrong profile for that document.",
      digital:
        "Applied to text without headings or lists, four criteria have nothing to check, and the score says nothing about them.",
    },
    changes: (n) => `${n} ${n === 1 ? "difference" : "differences"} from the default`,
    noChanges: "This is the reference configuration.",
    caveat:
      "Changing the purpose changes what is measured, not the text. Two scores are only comparable if they use the same profile and the same hash.",
  },

  profile: {
    label: "Analysis limits",
    defaults: "No limits changed.",
    adjustments: (n) => `You changed ${n} ${plural(n, "limit", "limits")}.`,
    chip: "Changes what gets flagged",
    lead:
      "Adjust the limits of criteria such as sentence and paragraph length. They apply to this analysis and " +
      "are recorded in the report.",
    openAdjust: "Adjust limits",
    resetDefaults: "Back to defaults",
    thresholdsLabel: "Limits",
    policyLabel: "Active criteria",
    policyNote:
      "Criteria you turn off are not checked and do not appear in the results. The report lists them, and you " +
      "can turn them back on at any time.",
    deviationOff: (label) => `${label}: off (default: on)`,
    deviationOn: (label) => `${label}: on (default: off)`,
    deviationValue: (what, value, fallback) => `${what} ${value} (default: ${fallback})`,
    decrease: (label) => `Decrease ${label}`,
    increase: (label) => `Increase ${label}`,
    provisionalTag: "provisional",
    provisionalNote:
      "Limits marked provisional have not been validated for this analysis language. Hover over the mark to see " +
      "where each number comes from.",
    knobSentenceWarn: "Inspect sentences above",
    knobParagraph: "Long paragraph: sentences above",
    knobHeading: "Long heading: words above",
    knobSubordination: "Dense subordination: minimum clauses",
    knobChainedNominalization: "Actions written as nouns: minimum per sentence",
    knobProseEnumeration: "Enumeration in prose: minimum items",
  },

  send: {
    always: "If you continue, the document will be sent to an external AI service.",
    found: (named: string) => `Lucid found ${named} in the document.`,
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
      "Select a passage in the document. The probe reads only the passage you choose, not the whole document.",
    excerptLabel: "Excerpt that will be sent",
    clearExcerpt: "clear",
    onlyThisExcerpt: "The probe answers only from what is in this excerpt.",
    excerptTooLong: (chars, max) =>
      `This excerpt has ${chars.toLocaleString("en-US")} characters, above the ${max.toLocaleString("en-US")} limit. Select a shorter passage.`,
    useBriefingPurpose: "Use what you defined as the reader's purpose:",
    questionLabel: "What does the reader need to find in the text?",
    questionPlaceholder: "e.g. When does the deadline start?",
    run: "Run comprehension test",
    httpFailure: (status) => `failed (HTTP ${status})`,
    running: "Testing…",
    staleWarning:
      "The text changed after this test, so the result below refers to the previous passage. Run the test again.",
    stuck: "The answer was not found in the text.",
    excerpt: "passage:",
    extracted: "Answer found:",
    noFloorViolation: "The answer was found in the text.",
    loadLabel: "Reading load",
    caveat:
      "This test uses AI and can be wrong. Finding the answer does not mean the text is clear; only testing with " +
      "real readers can show that.",
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
    dropHint: "Accepts .docx and .pdf",
    draft: "Draft",
    structured: "Structured document",
    underReview: "Document under review",
    textareaLabel: "Document text",
    emptyTitle: "Start your draft",
    emptyBody: "Write or paste your text. Lucid audits it as you type, criterion by criterion, without rewriting it.",
    headingLevel: (level) => `Heading · level ${level}`,
    list: "List",
    orderedList: "Numbered list",
    listItems: (n) => (n === 1 ? " · 1 item" : ` · ${n} items`),
    listLevels: (n) => ` · ${n} levels`,
    table: "Table",
    tableShape: (rows, columns) =>
      ` · ${rows} ${rows === 1 ? "row" : "rows"} × ${columns} ${columns === 1 ? "column" : "columns"}`,
    tableLabel: "Document table",
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
    editorialExtension: (locale) => `${locale} editorial extension`,
    editorialExtensionTag: (locale) => locale,
    editorialExtensionTitle: (locale) => `${locale} editorial extension (not part of the ISO standard)`,
    organizational: "The organisation's vocabulary",
    organizationalTag: "declared",
    organizationalTitle:
      "A term your organisation declared. It does not come from the standard and cites no clause: your organisation, which knows its readers, vouches that it gets in their way.",
    structuralHeuristic: "Structural heuristic",
    structuralHeuristicTag: "struct.",
    structuralHeuristicTitle: "Structural heuristic (not part of the ISO standard)",
  },

  ledger: {
    manual: "Author's edit",
    ai: "AI rewrite",
    glossary: "Direct swap from the glossary",
    attested: "Swap attested by a source",
    typing: "Passage rewritten by hand",
  },

  analysisLocale: {
    label: "Analysis language",
    lead:
      "The language of the document being audited. It is separate from the interface language: you can use " +
      "Lucid in Portuguese to audit an English text, or the other way round.",
    current: "Auditing as",
    onlyOne: "Only one analysis language is available today. When another is added, it will appear here.",
    switchWarning:
      "Switching the language analyses the document again with a different set of criteria. If you have work in " +
      "progress, Lucid asks first and tells you what would be discarded.",
    name: { "pt-BR": "Portuguese (Brazil)", "en-US": "English (US)" },
    experimentalTag: "experimental",
    experimentalNote:
      "Experimental catalogue. No criterion has been validated on an independent corpus; where test examples " +
      "exist, they only catch regressions and were written together with the detector. This language has no " +
      "readability, cohesion or AI rewriting, and it is only available here in the Studio: the command-line tool " +
      "analyses pt-BR only.",
    switchDialog: {
      title: (target) => `Switch the analysis language to ${target}?`,
      lead: "This work belongs to the current analysis language and will be discarded:",
      changes: (n) => `${n} recorded ${n === 1 ? "change" : "changes"}`,
      reviewed: (n) => `${n} reviewed or dismissed ${n === 1 ? "point" : "points"}`,
      baseline: "the attached starting point",
      vocabulary: (n) => `${n} organisation vocabulary ${n === 1 ? "term" : "terms"}`,
      profile: (name) => `the editorial profile “${name}”`,
      adjustments: (n) => `${n} limit ${n === 1 ? "adjustment" : "adjustments"}`,
      kept: "The document, the required expressions and the report information stay. The text is analysed again in the new language.",
      cancel: "Cancel",
      confirm: "Switch language and re-analyse",
    },
  },

  readability: {
    unavailable: "unavailable for this language",
    unavailableWhy:
      "Lucid has no readability formula for this language yet, so it shows no value. This says nothing about the " +
      "text: it is neither a zero nor a failed measurement.",
    noMeasure: "no measurement",
    noWords: "There are no words to measure, so no value was computed (this is not a zero).",
    noSentences: "No sentence was identified in the text, so no value was computed (this is not a zero).",
    smallSample: (words, threshold) =>
      `Small sample: ${words} ${plural(words, "word", "words")}. The formula is designed for running text; below ` +
      `${threshold} words, a single word can move the index by tens of points.`,
    sentenceBoundaryMissing: (wordsPerSentence, threshold) =>
      `${wordsPerSentence} words per sentence, above the plausible maximum of ${threshold}: no sentence boundary ` +
      "was found, probably because punctuation is missing in the pasted text.",
    syllablesImpossible: (syllablesPerWord, threshold) =>
      `${syllablesPerWord} syllables per word, above the plausible maximum of ${threshold}. The longest ` +
      "Portuguese word has 18 syllables, so something in the text is not a Portuguese word.",
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
