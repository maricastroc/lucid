export interface ChatCompletionOptions {
  model: string;
  temperature: number;
  maxTokens?: number;
}

export interface ChatProvider {
  readonly id: string;
  readonly models: readonly string[];
  complete(prompt: string, options: ChatCompletionOptions): Promise<string>;
}

export class ChatProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: string,
  ) {
    super(message);
    this.name = "ChatProviderError";
  }
}
