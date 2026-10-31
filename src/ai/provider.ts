export interface GenerateRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export interface TextProvider {
  listModels(signal?: AbortSignal): Promise<string[]>;
  stream(request: GenerateRequest, signal?: AbortSignal): AsyncIterable<string>;
}

// `network` is a fetch TypeError with no response, which Settings reads as a likely CORS problem.
export type ProviderErrorKind =
  | "network"
  | "http"
  | "timeout"
  | "bad-response"
  | "server";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind, message: string) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
  }
}
