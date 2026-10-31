import type { GenerateRequest } from "../provider";

export interface CodeInput {
  /** Programming language, in the prompt's own words. */
  language: string;
  /** Symbols the snippet may use besides letters, digits and spaces. */
  symbols: string;
}

const SYSTEM =
  "You write typing practice material. Reply with plain text only: no Markdown, no lists, no quotes around the answer, no introduction.";

// Code prompts stay English whatever the interface language: identifiers and keywords are English.
export function codeRequest(input: CodeInput): GenerateRequest {
  const symbols = [...input.symbols].join(" ");
  return {
    system: SYSTEM,
    prompt: `Write one realistic ${input.language} snippet of 3 to 12 lines. Besides letters and digits use only these symbols: ${symbols}. Comments at most one line. Indent with spaces. Example: function sum(a, b) {\\n  return a + b;\\n}`,
    maxTokens: 400,
    temperature: 0.6,
  };
}
