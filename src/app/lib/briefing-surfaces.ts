import type { ReaderBriefing } from "@/lucid";

export const REVIEW_FLOW_FIELDS = ["mustFind"] as const;

export const REPORT_RECORD_FIELDS = ["audience", "purpose", "priorKnowledge"] as const;

export type ReportRecordField = (typeof REPORT_RECORD_FIELDS)[number];

type Surfaced = (typeof REVIEW_FLOW_FIELDS)[number] | ReportRecordField;
const _exhaustive: Record<keyof ReaderBriefing, true> = {} as Record<Surfaced, true>;
void _exhaustive;
