import type { ChatProviderErrorKind } from "@/llm";

export const LUCID_RATE_LIMIT_KIND = "lucid_rate_limit";

export type RewriteFailureKind = ChatProviderErrorKind | typeof LUCID_RATE_LIMIT_KIND;
