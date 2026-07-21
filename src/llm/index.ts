/**
 * Barrel da infra de LLM compartilhada (`src/llm`). Ver ADR-016.
 */
export { GroqProvider, GROQ_MODELS } from "./groq";
export { GeminiProvider, GEMINI_MODELS } from "./gemini";
export type { TokenUsage } from "./groq";
export { ChatProviderError } from "./types";
export type { ChatProvider, ChatCompletionOptions } from "./types";
