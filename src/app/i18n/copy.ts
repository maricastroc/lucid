import type { CriterionId, PrincipleGroup, Severity, SpliceRefusal } from "@/lucid";
import type { AuditViewId } from "../lib/audit-views";
import type { MetricRowKey } from "../lib/metric-rows";
import type { CriterionCoverage } from "@/report/eval/contract";
import type { LedgerSource } from "../lib/ledger";
import type { UiLang } from "./types";
import { COPY_PT } from "./copy.pt";
import { COPY_EN } from "./copy.en";

export interface UiCopy {
  readonly common: {
    readonly close: string;
    readonly cancel: string;
    readonly restore: string;
    readonly add: string;
    readonly remove: string;
    readonly copy: string;
    readonly copied: string;
    readonly words: string;
    readonly engineOutputSuffix: string;
  };

  readonly language: {
    readonly ariaLabel: string;
    readonly short: Record<UiLang, string>;
    readonly switchTo: Record<UiLang, string>;
  };

  readonly masthead: {
    readonly home: string;
    readonly tagline: string;
    readonly openDocument: string;
    readonly opening: string;
    readonly evaluation: string;
    readonly workMode: string;
    readonly review: string;
    readonly write: string;
    readonly darkTheme: string;
    readonly lightTheme: string;
  };

  readonly welcome: {
    readonly regionLabel: string;
    readonly kicker: string;
    readonly titleLead: string;
    readonly titleTrail: string;
    readonly lead: string;
    readonly leadStrong: string;
    readonly doesLabel: string;
    readonly verbs: readonly string[];
    readonly doesNotBefore: string;
    readonly doesNotStrong: string;
    readonly doesNotAfter: string;
    readonly write: string;
    readonly loadExample: string;
    readonly anatomyLabel: string;
    readonly cardCriterion: { readonly title: string; readonly body: string };
    readonly cardWhy: { readonly title: string; readonly body: string };
    readonly cardWhat: { readonly title: string; readonly body: string };
    readonly outcomeSafe: string;
    readonly outcomeHuman: string;
    readonly footerDeterministic: string;
    readonly footerSameInput: string;
    readonly footerNoCloud: string;
  };

  readonly studio: {
    readonly goHome: {
      readonly title: string;
      readonly body: string;
      readonly confirm: string;
    };
    readonly spliceRefused: Record<SpliceRefusal, string>;
    readonly spliceRefusedKept: string;
    readonly spliceAcceptPlain: string;
    readonly spliceDiscard: string;
    readonly saveFailed: string;
    readonly importRefusal: {
      readonly unreadable: string;
      readonly tracked_changes: string;
      readonly scanned: string;
      readonly columns: string;
      readonly glued: string;
      readonly invariant: string;
      readonly no_readable_content: string;
    };
    readonly openAudit: (pending: number) => string;
    readonly changeApplied: string;
    readonly undo: string;
  };

  readonly panel: {
    readonly navLabel: string;
    readonly settingsTitle: string;
    readonly settingsLead: string;
    readonly settingsSummaryExpressions: (n: number) => string;
    readonly settingsSummaryProfile: (deviations: number) => string;
    readonly settingsSummaryJoin: string;
    readonly settingsRecordPointer: string;
    readonly settingsIsoNote: string;
    readonly settingsIsoTitle: string;
    readonly settingsOpen: string;
    readonly settingsClose: string;
    readonly settingsDone: string;
    readonly goToFindingsHint: string;
    readonly exportLabel: string;
    readonly exportMenuLabel: string;
    readonly provenanceTitle: (configHash: string, version: string) => string;
  };

  readonly overview: {
    readonly foundLabel: string;
    readonly movedLabel: string;
    readonly seeChanges: string;
    readonly limitsLabel: string;
    readonly annotations: (n: number) => string;
    readonly adjustedProfileBefore: string;
    readonly adjustedProfileStrong: string;
    readonly adjustedProfile: (deviations: number, disabled: number) => string;
    readonly adjustedProfileAfter: string;
    readonly splitAriaLabel: (safe: number, human: number) => string;
    readonly legendSafe: (n: number) => string;
    readonly legendHuman: (n: number) => string;
    readonly severityCount: (severity: Severity, n: number) => string;
    readonly exportAudit: string;
    readonly printAudit: string;
    readonly printNote: string;
    readonly exportDocx: string;
    readonly exportDocumentMd: string;
    readonly printDocument: string;
    readonly groupAudit: string;
    readonly groupDocument: string;
    readonly exportTxt: string;
    readonly docxError: string;
    readonly docxNote: string;
    readonly importTables: (n: number) => string;
    readonly importTextBoxes: (n: number) => string;
    readonly importRuledRegions: (n: number) => string;
    readonly importFurniture: (n: number) => string;
    readonly importDehyphenated: (n: number) => string;
    readonly importAnd: string;
    readonly importAlso: string;
    readonly importRecovered: (styles: string) => string;
    readonly importFlattened: (what: string) => string;
    readonly importFromPdf: (what: string) => string;
    readonly structureMissing: Record<string, string>;
    readonly structureMissingJoin: string;
    readonly structureCaveat: (missing: string, count: number) => string;
    readonly scoreCaveat: string;
    readonly readingLabel: string;
    readonly readingCaveat: string;
    readonly balanceWeightNoun: string;
    readonly balanceLabel: string;
    readonly balanceNone: string;
    readonly balanceTotal: (before: string, after: string) => string;
    readonly balanceFound: (before: number, after: number) => string;
    readonly balanceCount: (before: number, after: number) => string;
    readonly balanceDirection: Record<"improved" | "regressed" | "unchanged", string>;
    readonly balanceKind: Record<"resolved" | "kept" | "reshaped" | "introduced" | "transformed" | "indirect", string>;
    readonly balanceTransformed: (before: number, after: number) => string;
    readonly balanceIndirectNote: string;
    readonly balanceTypingNote: string;
    readonly balanceCaveat: string;
    readonly trailLabel: string;
    readonly trailWeight: (before: string, after: string, changes: number) => string;
    readonly trailCaveat: string;
    readonly changeFrom: string;
    readonly changeTo: string;
    readonly changeExpand: string;
    readonly changeCollapse: string;
    readonly entryLabel: string;
    readonly entryShow: string;
    readonly entryHide: string;
    readonly entrySize: (chars: number) => string;
    readonly entryNote: string;
    readonly entryStartingPoint: string;
    readonly entryUnknown: string;
    readonly entryWrittenHere: string;
    readonly descriptor: string;
    readonly metricWords: string;
    readonly metricSentences: string;
    readonly metricWordsPerSentence: string;
    readonly metricReadability: string;
    readonly metricReferentialCohesion: string;
    readonly metricAdjacentGap: string;
    readonly metricConnectives: string;
  };

  readonly revisionList: {
    readonly regionLabel: string;
    readonly title: string;
    readonly browseLabel: string;
    readonly filterLabel: string;
    readonly bucketAll: string;
    readonly bucketSafe: string;
    readonly bucketHuman: string;
    readonly empty: string;
    readonly emptyFilterTitle: string;
    readonly emptyFilterBody: (found: number) => string;
    readonly hideInDocument: string;
    readonly hideNamed: (label: string) => string;
    readonly showInDocument: string;
    readonly showNamed: (label: string) => string;
    readonly coverage: string;
    readonly cleanCriteria: (n: number) => string;
    readonly hiddenCriteria: (n: number) => string;
    readonly highlightsOff: string;
    readonly absenceCaveat: string;
    readonly occurrences: (n: number) => string;
    readonly distinct: (n: number) => string;
    readonly hiddenByFilter: (n: number) => string;
    readonly statePending: string;
    readonly stateSeen: string;
    readonly stateDismissedOne: string;
    readonly stateDismissed: string;
    readonly searchLabel: string;
    readonly searchPlaceholder: string;

    readonly moreFilters: string;
    readonly fewerFilters: string;
    readonly clearFilters: string;
    readonly orderBySeverity: string;
    readonly orderByDocument: string;
    readonly batchLabel: string;
    readonly batchClear: (n: number) => string;
    readonly batchCaveat: string;
    readonly clearGroupMarks: (n: number) => string;
    readonly scopeOn: string;
    readonly scopeOff: string;
    readonly scopeHint: (n: number) => string;
    readonly markSeen: string;
    readonly markSeenHint: string;
    readonly markSeenNamed: (excerpt: string) => string;
    readonly dismiss: string;
    readonly dismissHint: string;
    readonly dismissNamed: (excerpt: string) => string;
    readonly unmark: string;
    readonly unmarkHint: string;
    readonly progress: (done: number, total: number) => string;
    readonly pendingCount: (n: number) => string;
    readonly progressCaveat: string;
    readonly progressTitle: (done: number, total: number) => string;
    readonly lexiconCaveat: string;
  };

  readonly badges: {
    readonly safeShort: string;
    readonly safeLong: string;
    readonly humanShort: string;
    readonly humanLong: string;
  };

  readonly note: {
    readonly excerpt: string;
    readonly whatWeFound: string;
    readonly whyItMatters: string;
    readonly understandCriterion: string;
    readonly excerptMore: string;
    readonly excerptLess: string;
    readonly engineOutput: string;
    readonly engineOutputHint: string;
    readonly navPrev: string;
    readonly navNext: string;
    readonly navOf: string;
    readonly panelLabel: string;
    readonly crumbAll: string;
    readonly crumbBackTo: (criterion: string) => string;
    readonly backToList: string;
    readonly footerDeterministic: string;

    readonly safeHeader: string;
    readonly safeTerm: string;
    readonly safePlain: string;
    readonly safeEquivalent: string;
    readonly safeApply: (term: string) => string;
    readonly safeApplyNote: string;
    readonly safeNote: string;

    readonly humanHeader: string;
    readonly humanLead: string;

    readonly humanLeadByCriterion: Partial<Record<CriterionId, string>>;
    readonly howToProceed: string;

    readonly manualOpen: string;
    readonly manualTitle: string;
    readonly manualUnitSentence: string;
    readonly manualUnitParagraph: string;
    readonly manualEditAria: (unit: string) => string;
    readonly manualVerify: string;
    readonly manualVerifying: string;
    readonly manualNote: string;

    readonly aiTitle: string;
    readonly aiTarget: (unit: string) => string;
    readonly proposerManual: string;
    readonly aiRun: string;
    readonly aiRunning: string;
    readonly aiFailed: (message: string) => string;
    readonly aiFailedGeneric: string;
    readonly aiNoProposal: string;

    readonly verdictLabel: string;
    readonly verdictProofs: (passed: number, total: number) => string;
    readonly verdictBlocked: string;
    readonly verdictClear: string;
    readonly verdictWords: string;
    readonly verdictMeasureNotApproval: string;
    readonly proofLabel: string;
    readonly signalLabel: string;
    readonly evaluatedExcerpt: string;
    readonly proposerTitle: string;
    readonly applyStale: string;
    readonly applyBlocked: string;
    readonly apply: string;
    readonly applyStaleNote: string;
    readonly applyBlockedNote: string;
    readonly applyNote: string;
  };

  readonly guidance: {
    readonly generic: string;
    readonly passivaSintetica: string;
    readonly nominalizacaoEncadeada: string;
    readonly siglaSemExpansao: string;
    readonly redundancia: string;
    readonly perifraseInflada: string;
    readonly duplaNegacao: string;
    readonly maisQuePerfeito: string;
    readonly gerundismo: string;
    readonly adverbioMenteDenso: string;
    readonly adverbiosVagos: string;
    readonly mesoclise: string;
    readonly paragraphLength: string;
    readonly proseEnumeration: string;
    readonly saltoDeNivelTitulo: string;
    readonly longHeading: string;
    readonly singleItemList: string;
    readonly headingBodyMismatch: string;
    readonly jargon: string;

    readonly nominalizationBaseVerb: (verb: string) => string;
    readonly nominalizationBody: string;

    readonly readerNamed: (noun: string) => string;
    readonly readerUnnamed: string;
    readonly readerBody: string;
    readonly readerBodyStrong: string;

    readonly subordinationCount: (clauses: number) => string;
    readonly subordinationTrapped: string;
    readonly subordinationBody: string;

    readonly longSentenceLead: string;
    readonly longSentenceLeadStrong: string;
    readonly longSentenceWithCuts: string;
    readonly longSentenceWithCutsStrong: string;
    readonly longSentenceWithCutsTail: string;
    readonly longSentenceNoCuts: string;
    readonly statWords: string;
    readonly statTrigger: string;
    readonly statTriggerNote: string;
    readonly standardSaysLabel: string;
    readonly standardSays: string;
    readonly parameterSaysLabel: string;
    readonly parameterSays: (threshold: number) => string;
    readonly coOccurringLabel: string;
    readonly coOccurringNote: string;
    readonly coOccurringNone: string;
    readonly cutsAvailable: (n: number) => string;
    readonly cutsInformationNotAction: string;
    readonly cutLabel: (i: number, boundary: string) => string;
    readonly cutsNote: string;
    readonly boundarySemicolon: string;
    readonly boundaryDash: string;
    readonly boundaryCommaConjunction: (marker: string) => string;

    readonly passiveWithAgent: string;
    readonly passiveNoAgentLead: string;
    readonly passiveNoAgentBody: string;
    readonly passiveNoAgentStrong: string;
    readonly passiveNoAgentRequirement: string;
    readonly scaffoldLead: string;
    readonly scaffoldLeadStrong: string;
    readonly scaffoldLeadTail: string;
    readonly scaffoldAgent: string;
    readonly scaffoldAgentHint: string;
    readonly scaffoldAction: string;
    readonly scaffoldActionHint: string;
    readonly scaffoldPickVerb: string;
    readonly scaffoldObject: string;
    readonly scaffoldObjectHint: string;
    readonly scaffoldObjectPlaceholder: string;
    readonly scaffoldNote: string;
    readonly agentQuestion: string;
    readonly agentPlaceholder: string;
    readonly agentKeepImpersonal: string;
    readonly agentRecordedKeep: string;
    readonly agentRecorded: (agent: string) => string;
  };

  readonly briefing: {
    readonly label: string;
    readonly chip: string;
    readonly lead: string;
    readonly audienceLabel: string;
    readonly audienceHint: string;
    readonly audiencePlaceholder: string;
    readonly purposeLabel: string;
    readonly purposeHint: string;
    readonly purposePlaceholder: string;
    readonly priorLabel: string;
    readonly priorHint: string;
    readonly priorPlaceholder: string;
    readonly mustFindLabel: string;
    readonly mustFindHint: string;
    readonly mustFindPlaceholder: string;
    readonly addExpression: string;
    readonly presenceLabel: string;
    readonly occurrences: (n: number) => string;
    readonly notFound: string;
    readonly showOccurrences: (expression: string, n: number) => string;
    readonly occurrencePosition: (index: number, total: number) => string;
    readonly occurrenceNav: (expression: string) => string;
    readonly prevOccurrence: (expression: string) => string;
    readonly nextOccurrence: (expression: string) => string;
    readonly removeNamed: (expression: string) => string;
    readonly literalCaveat: string;
  };

  readonly reportRecord: {
    readonly menuItem: string;
    readonly menuNote: string;
    readonly title: string;
    readonly optionalTag: string;
    readonly lead: string;
    readonly caveat: string;
    readonly isoNote: string;
    readonly isoTitle: string;
    readonly done: string;
  };

  readonly views: Record<AuditViewId, { readonly label: string; readonly purpose: string }>;

  readonly counts: {
    readonly stripLabel: string;
    readonly found: (n: number) => string;
    readonly pending: (n: number) => string;
    readonly reviewed: (n: number) => string;
    readonly dismissed: (n: number) => string;
    readonly noun: {
      readonly found: (n: number) => string;
      readonly pending: (n: number) => string;
      readonly pendingPoints: (n: number) => string;
      readonly reviewed: (n: number) => string;
      readonly dismissed: (n: number) => string;
      readonly change: (n: number) => string;
    };
    readonly shown: (shown: number, found: number) => string;
    readonly shownAll: (found: number) => string;
    readonly stepsDone: (done: number, total: number) => string;
    readonly nothingPending: string;
    readonly resolvedSince: (resolved: number, introduced: number) => string;
  };

  readonly route: {
    readonly label: string;
    readonly tabsLabel: string;
    readonly tabRoute: string;
    readonly tabBrowse: string;
    readonly idleLead: (found: number, steps: number) => string;
    readonly stepOf: (index: number, total: number) => string;
    readonly begin: string;
    readonly resume: string;
    readonly beginHint: (index: number, label: string) => string;
    readonly resumeHint: (index: number, label: string) => string;
    readonly openStep: string;
    readonly resumeStep: string;
    readonly stepPending: (n: number) => string;
    readonly stepProgress: (reviewed: number, count: number) => string;
    readonly routeProgress: (reviewed: number, found: number) => string;
    readonly nextUp: (index: number, label: string) => string;
    readonly advance: (index: number, label: string) => string;
    readonly finishedTitle: (label: string) => string;
    readonly finishedCount: (reviewed: number, dismissed: number) => string;
    readonly reviewAgain: string;
    readonly allDoneTitle: string;
    readonly allDoneCount: (reviewed: number, steps: number) => string;
    readonly allDoneBody: string;
    readonly allDoneNext: string;
    readonly leave: string;
    readonly leaveDone: string;
    readonly backToReview: string;
    readonly stepsLabel: string;
    readonly stepDone: string;
    readonly stepPartial: (reviewed: number, count: number) => string;
    readonly startTag: string;
    readonly resumeTag: string;
    readonly stepAction: (label: string, n: number) => string;
    readonly states: Record<"not-started" | "in-progress" | "done", string>;
    readonly orderCaveat: string;
    readonly swapShortcutLabel: string;
    readonly swapShortcut: (n: number) => string;
    readonly browseLead: string;
    readonly browseReturn: (index: number, label: string) => string;
  };

  readonly guided: {
    readonly trailLabel: string;
    readonly trailStep: (index: number, total: number, label: string, state: string) => string;
    readonly occurrenceOf: (index: number, total: number) => string;
    readonly backToStep: string;
    readonly markAndAdvance: string;
    readonly markAndFinish: string;
    readonly seenChip: string;
    readonly nextOccurrence: string;
    readonly stepOccurrences: string;
    readonly stepProgressLabel: string;
    readonly routeProgressLabel: string;
  };

  readonly decision: {
    readonly label: string;
    readonly kinds: Record<"seen" | "dismissed", string>;
    readonly fieldLabel: string;
    readonly placeholder: string;
    readonly caveat: string;
    readonly reportPointer: string;
  };

  readonly changes: {
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly listLabel: string;
    readonly effectLabel: string;
    readonly detailsShow: string;
    readonly detailsHide: string;
    readonly undoLast: string;
    readonly weightMeaning: string;
    readonly stillOpen: (n: number) => string;
    readonly none: string;
  };

  readonly baseline: {
    readonly label: string;
    readonly saveAction: string;
    readonly attachAction: string;
    readonly detach: string;
    readonly dialogTitle: string;
    readonly dialogLead: string;
    readonly titleLabel: string;
    readonly titleHint: string;
    readonly titlePlaceholder: string;
    readonly fileNotice: string;
    readonly save: string;
    readonly savedAt: (when: string) => string;
    readonly emptyLead: string;
    readonly sameRuler: string;
    readonly historical: (count: number) => string;
    readonly rebased: (count: number) => string;
    readonly engineDrift: (delta: number) => string;
    readonly divergenceLabel: string;
    readonly divergenceFields: Record<
      "lucidVersion" | "localeId" | "configHash" | "dataHash" | "standardVersion",
      string
    >;
    readonly adoptProfile: string;
    readonly adoptProfileHint: string;
    readonly stillThereLabel: string;
    readonly stillThereCount: (n: number) => string;
    readonly stillThereLead: string;
    readonly stillThereNone: string;
    readonly occurrences: (n: number) => string;
    readonly alreadyDecided: Record<"seen" | "dismissed", string>;
    readonly noReason: string;
    readonly refusal: Record<"unreadable" | "schema" | "locale", string>;
    readonly caveat: string;
  };

  readonly metricsView: {
    readonly notAScore: string;
    readonly explainShow: string;
    readonly explainHide: string;
    readonly meaningLabel: string;
    readonly directionLabel: string;
    readonly limitLabel: string;
    readonly meanings: Record<
      MetricRowKey,
      { readonly meaning: string; readonly direction: string; readonly limit: string }
    >;
  };

  readonly presets: {
    readonly label: string;
    readonly lead: string;
    readonly current: (name: string) => string;
    readonly adjustedOn: (name: string, n: number) => string;
    readonly stamp: (name: string, version: number, hash: string) => string;
    readonly names: Record<"base" | "normativo" | "publico" | "digital", string>;
    readonly purposes: Record<"base" | "normativo" | "publico" | "digital", string>;
    readonly limits: Record<"base" | "normativo" | "publico" | "digital", string>;
    readonly changes: (n: number) => string;
    readonly noChanges: string;
    readonly caveat: string;
  };

  readonly profile: {
    readonly label: string;
    readonly defaults: string;
    readonly adjustments: (n: number) => string;
    readonly chip: string;
    readonly lead: string;
    readonly openAdjust: string;
    readonly resetDefaults: string;
    readonly thresholdsLabel: string;
    readonly policyLabel: string;
    readonly policyNote: string;
    readonly deviationOff: (label: string) => string;
    readonly deviationOn: (label: string) => string;
    readonly deviationValue: (what: string, value: string, fallback: string) => string;
    readonly decrease: (label: string) => string;
    readonly increase: (label: string) => string;
    readonly knobSentenceWarn: string;
    readonly knobParagraph: string;
    readonly knobHeading: string;
    readonly knobSubordination: string;
    readonly knobChainedNominalization: string;
    readonly knobProseEnumeration: string;
  };

  readonly send: {
    readonly always: string;
    readonly found: (named: string) => string;
    readonly limit: string;
    readonly kinds: Record<"cpf" | "cnpj" | "email", (n: number) => string>;
    readonly join: string;
    readonly lastJoin: string;
  };

  readonly probe: {
    readonly title: string;
    readonly lead: string;
    readonly selectPrompt: string;
    readonly excerptLabel: string;
    readonly clearExcerpt: string;
    readonly onlyThisExcerpt: string;
    readonly excerptTooLong: (chars: number, max: number) => string;
    readonly useBriefingPurpose: string;
    readonly questionLabel: string;
    readonly questionPlaceholder: string;
    readonly run: string;
    readonly httpFailure: (status: number) => string;
    readonly running: string;
    readonly staleWarning: string;
    readonly stuck: string;
    readonly excerpt: string;
    readonly extracted: string;
    readonly noFloorViolation: string;
    readonly loadLabel: string;
    readonly caveat: string;
    readonly operations: {
      readonly resolver_referente_a_distancia: string;
      readonly integrar_entre_frases: string;
      readonly decodificar_termo_tecnico: string;
      readonly inferir_agente_omitido: string;
      readonly segurar_sujeito_longo: string;
      readonly desfazer_negacao_aninhada: string;
    };
  };

  readonly documentView: {
    readonly regionLabel: string;
    readonly emptyDrop: string;
    readonly dropHere: string;
    readonly dropHint: string;
    readonly draft: string;
    readonly structured: string;
    readonly underReview: string;
    readonly textareaLabel: string;
    readonly emptyTitle: string;
    readonly emptyBody: string;
    readonly headingLevel: (level: number) => string;
    readonly list: string;
    readonly orderedList: string;
    readonly listItems: (n: number) => string;
    readonly segmentLabel: (label: string, text: string, severity: string) => string;
    readonly sheetLabel: string;
    readonly sheetClose: string;
    readonly sheetCollapse: string;
  };

  readonly taxonomy: {
    readonly severity: Record<Severity, string>;
    readonly principleGroup: Record<PrincipleGroup, string>;
    readonly coverage: Record<CriterionCoverage, string>;
    readonly editorialExtension: string;
    readonly editorialExtensionTag: string;
    readonly editorialExtensionTitle: string;
    readonly structuralHeuristic: string;
    readonly structuralHeuristicTag: string;
    readonly structuralHeuristicTitle: string;
  };

  readonly ledger: Record<LedgerSource, string>;

  readonly readability: {
    readonly noMeasure: string;
    readonly noWords: string;
    readonly noSentences: string;
    readonly smallSample: (words: number, threshold: number) => string;
    readonly sentenceBoundaryMissing: (wordsPerSentence: string, threshold: number) => string;
    readonly syllablesImpossible: (syllablesPerWord: string, threshold: number) => string;
    readonly bandLabel: Record<string, string>;
    readonly band: (label: string, min: number, max: number) => string;
    readonly inRange: (range: string) => string;
    readonly aboveRange: (range: string) => string;
    readonly belowRange: (range: string) => string;
  };
}

export const COPY: Record<UiLang, UiCopy> = {
  "pt-BR": COPY_PT,
  en: COPY_EN,
};

export function copyFor(lang: UiLang): UiCopy {
  return COPY[lang];
}
