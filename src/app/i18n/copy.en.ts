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
    tagline: "Plain language auditor",
    openDocx: "Open .docx",
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
    goHomeConfirm: "Back to start? The text and the revision trail will be discarded.",
    structureLost:
      "Your edits moved the document beyond what the imported structure can track. Headings and lists are no longer " +
      "recognized, so the Principle 2 criteria are not being applied from here on.",
    saveFailed:
      "This work could not be saved in the browser — it will be lost if you close the tab. Export the report so you " +
      "do not depend on it.",
    importUnreadable: "The file could not be read. Check that it is a valid .docx.",
    revisions: (n) => `${n} ${plural(n, "revision", "revisions")}`,
    changeApplied: "Change applied to the text.",
    undo: "Undo",
  },

  overview: {
    annotations: (n) => plural(n, "annotation", "annotations"),
    inThisReview: "in this editorial review",
    adjustedProfileBefore: "Score produced with an ",
    adjustedProfileStrong: "adjusted profile",
    adjustedProfile: (deviations, disabled) =>
      `${deviations} ${plural(deviations, "deviation", "deviations")} from the default` +
      (disabled > 0
        ? `, ${disabled} ${plural(disabled, "criterion switched off", "criteria switched off")}`
        : ""),
    adjustedProfileAfter: "It is not comparable to a default score.",
    splitAriaLabel: (safe, human) => `${safe} direct swaps, ${human} require a human decision`,
    legendSafe: "direct swap available",
    legendHuman: "author's decision",
    exportAudit: "Export audit (.md)",
    exportDocx: "Document (.docx)",
    exportTxt: ".txt",
    docxError: "The .docx could not be generated. Use the .txt export instead.",
    docxNote: (structured) =>
      "The exported .docx is a new document, carrying the revised text and the structure Lucid can see" +
      (structured ? " (headings, paragraphs and lists)" : " (paragraphs)") +
      ". Formatting from the original file — bold, tables, images, headers — is not part of the audit and therefore " +
      "does not come back in the export.",
    scoreCaveat: "The score measures; it does not approve. No annotations is not a certificate of clarity.",
    lexiconCaveat:
      "Lexical criteria (jargon, nominalization, redundancy…) check curated lists: a low or zero count does not prove " +
      "the phenomenon is absent — only that nothing on the list matched here.",
    readingLabel: "Reading",
    readingCaveat:
      "Readability and cohesion are supporting descriptors, never approval: a high or low value is not, on its own, " +
      "good or bad (high cohesion may be repetition; low may be variation). The readability value is never clamped — " +
      "the number shown is the one computed, and the band is a reading placed beside it.",
    trailLabel: "Revision trail",
    trailWeight: (before, after, changes) =>
      `Audit weight ${before} → ${after} · ${changes} ${plural(changes, "change", "changes")}`,
    trailCaveat:
      "A record of what was done in this session — not a certificate of quality. It goes into the exported report.",
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
    bySeverity: "by severity",
    filterLabel: "Filter annotations",
    bucketAll: "All",
    bucketSafe: "Direct swap",
    bucketHuman: "Your call",
    empty: "No annotations fired.",
    emptyInFilter: "No annotations under this filter.",
    hideInDocument: "Hide in the document",
    hideNamed: (label) => `Hide “${label}” in the document`,
    showInDocument: "Show in the document",
    showNamed: (label) => `Show “${label}” in the document`,
    coverage: "Coverage",
    cleanCriteria: (n) => `${n} ${plural(n, "criterion checked, no occurrence", "criteria checked, no occurrence")}`,
    hiddenCriteria: (n) => `${n} hidden`,
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
    engineOutput: "Engine output · pt-BR",
    engineOutputHint:
      "The justification comes from the analysis engine, which audits Portuguese — it is not translated along with the interface.",
    navPrev: "Previous (k)",
    navNext: "Next (j)",
    navOf: "of",
    panelLabel: "Audit",
    footerDeterministic: "Deterministic analysis",

    safeHeader: "Direct swap · curated equivalent",
    safeTerm: "Term",
    safePlain: "Plain",
    safeEquivalent: "1:1 equivalent from the glossary",
    safeNote:
      "The tool points to the equivalent; it does not alter the text. Make the swap under “Edit or paste my version” " +
      "below — the engine will re-audit the result.",

    humanHeader: "Requires a human decision",
    humanLead:
      "The tool identified the construction, but there is no safe rewrite without knowing the author's intent — so it " +
      "would rather ",
    humanLeadStrong: "point than invent",
    howToProceed: "How to proceed",

    manualOpen: "Edit or paste my version",
    manualTitle: "Your version",
    manualUnitSentence: "this sentence",
    manualUnitParagraph: "this paragraph",
    manualEditAria: (unit) => `Edit ${unit}`,
    manualVerify: "Verify my version",
    manualVerifying: "Verifying…",
    manualNote:
      "You write or paste; the engine judges your version with the same proofs it applies to the AI — no source is " +
      "privileged. Applying it creates a draft and the engine re-audits.",

    aiTitle: "AI rewrite",
    aiLead: "One way of proposing a new version — the AI rewrites; you can also ",
    aiLeadStrongYours: "edit or paste your own",
    aiLeadMiddle: ". The engine judges either one the same way. Optional: the ",
    aiLeadStrongDiagnostic: "diagnosis above does not depend on this",
    aiTarget: (unit) => `The AI will rewrite ${unit} (highlighted in the document).`,
    aiModelLabel: "Generator model",
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
    verdictClear: "No floor failure in this passage.",
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
    label: "Principle 1 · Relevant",
    declared: "Reader briefing declared by you.",
    notDeclared: "Reader briefing not declared.",
    rationaleBefore: "The standard asks you to model the reader ",
    rationaleEmphasis: "before",
    rationaleMiddle: " writing: who reads it, what they need to do, what goes in and what stays out. ",
    rationaleStrong: "No automatic rule decides what is relevant to your reader",
    rationaleAfter:
      " — which is why Lucid does not score this principle and does not treat it as met. It asks, records your answer, " +
      "and checks only what is literally checkable.",
    openDeclare: "Declare the reader briefing",
    openReview: "Review briefing",
    closeBriefing: "Close briefing",
    audienceLabel: "Who is the reader?",
    audienceHint: "Describe who will actually read it — not the official who signs it.",
    audiencePlaceholder: "e.g. a citizen with no legal training applying for the benefit for the first time",
    purposeLabel: "What do they need to do after reading?",
    purposeHint: "The concrete action or decision the text has to make possible.",
    purposePlaceholder: "e.g. find out whether they qualify and gather the documents in time",
    priorLabel: "What do they already know?",
    priorHint: "What can be assumed — and, by consequence, what must be explained.",
    priorPlaceholder: "e.g. knows the benefit exists; does not know the vocabulary of the process",
    mustFindLabel: "What does the reader need to find in the text?",
    mustFindHintBefore: "One expression per item. The tool looks for each one ",
    mustFindHintStrong: "literally",
    mustFindHintAfter: " and says where it is — it does not judge whether the topic was covered.",
    mustFindPlaceholder: "e.g. prazo de recurso",
    presenceLabel: "Literal presence",
    occurrences: (n) => ` — appears ${n}×`,
    notFound: " — does not appear in these words",
    removeNamed: (expression) => `Remove “${expression}”`,
    literalCaveat:
      "Literal, accent-sensitive search. Finding it does not prove the reader will understand; not finding it does not " +
      "prove the topic is absent — it may be said in other words. This list is yours, not a criterion of the standard: " +
      "it does not enter the score.",
  },

  profile: {
    label: "Editorial profile",
    defaults: "Lucid's default thresholds.",
    adjustments: (n) => `${n} ${plural(n, "adjustment of yours", "adjustments of yours")} over the default.`,
    rationaleBefore:
      "The standard fixes no numbers — the long-sentence threshold is an editorial choice, and your style guide may " +
      "differ from the default here. Adjusting is legitimate; ",
    rationaleStrong: "hiding the adjustment is not",
    rationaleAfter: ". Every deviation appears below, enters the exported report, and changes the ",
    rationaleTail: " that stamps the audit.",
    openAdjust: "Adjust profile",
    closeAdjust: "Close profile",
    resetDefaults: "Back to defaults",
    thresholdsLabel: "Thresholds",
    policyLabel: "Policy criteria",
    policyNote:
      "Switching a criterion off stops its pass from running. Its silence stops meaning “I found nothing” and starts " +
      "meaning “I did not look” — which is why every switch-off is listed above and in the report.",
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

  probe: {
    title: "Comprehension probe",
    tier: "Layer 2 · opt-in",
    leadBefore: "A floor-level synthetic reader reads ",
    leadEmphasis: "only",
    leadMiddle: " the text above and tries to answer the question. It is a ",
    leadStrong: "negative",
    leadAfter: " test: it can find a failure, never approve.",
    useBriefingPurpose: "Use the reader's purpose you declared under Principle 1:",
    questionLabel: "What do you want to find in the text?",
    questionPlaceholder: "e.g. when does the deadline start counting?",
    run: "Test the comprehension floor",
    httpFailure: (status) => `failed (HTTP ${status})`,
    running: "Testing the floor…",
    staleWarning:
      "The text changed after this test — the result below is for the previous passage. Run it again.",
    stuck: "The floor reader got stuck.",
    excerpt: "passage:",
    extracted: "The answer it extracted:",
    noFloorViolation: "No floor violation detected.",
    loadLabel: "Reading load",
    caveatBefore: "Layer 2 uses a language model: it is ",
    caveatStrongOne: "not deterministic",
    caveatMiddle: " like the rest of the audit. Passing the floor is the absence of one failure, ",
    caveatStrongTwo: "never proof of clarity",
    caveatAfter: " — for that, only testing with real readers (Principle 4 of the standard).",
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
