# Model integration (optional)

Tenfold can use a language model running on your own machine to generate practice material. This is an extra: every mode has an offline equivalent, and the app works identically with no model server.

## Rules

1. **Optional.** Nothing in `src/ai/` loads unless a model server is configured. The `ai` chunk is imported dynamically.
2. **Never blocks typing.** Generation runs ahead of the learner: the next passage for the current mode and lesson is requested in the background (`src/ui/prefetch.ts` holds at most one result per key and aborts a request whose key changed). A session uses it only if it is already ready; otherwise the offline generator fills in with no wait.
3. **Fails quietly.** Network errors, timeouts, bad output or a stopped server fall back to offline content. A small status dot in Settings shows the connection state; no modal errors.
4. **Local by default.** The default address is `http://localhost:11434/v1`. No data is sent anywhere else unless the user enters another address. Only prompts and session statistics are sent, never typed text.
5. **Validated.** Generated text is checked before it is shown (see Validation).

## Provider interface

```ts
interface TextProvider {
  listModels(signal?: AbortSignal): Promise<string[]>
  stream(request: GenerateRequest, signal?: AbortSignal): AsyncIterable<string>
}

interface GenerateRequest {
  system: string
  prompt: string
  maxTokens: number
  temperature: number
}
```

`openai-compatible.ts` implements this against:

- `GET {baseUrl}/models`
- `POST {baseUrl}/chat/completions` with `stream: true`, parsing server-sent events.

This works with Ollama, LM Studio, the llama.cpp server and other compatible servers. An optional API key is sent as `Authorization: Bearer …` only if set.

Timeouts: 5 s to first token, 30 s total; both abort through `AbortController`. Failures throw `ProviderError` (`network`, `http`, `timeout`, `bad-response`, `server`). The model name is set when the provider is created.

## Settings

| Setting | Default |
|---|---|
| Enabled | off |
| Topic | empty (the subject for Learn a topic) |
| Base URL | `http://localhost:11434/v1` |
| Model | none (chosen from the list returned by the server) |
| API key | empty, stored locally, excluded from export |
| Modes | each of the four modes can be turned on separately |

"Test connection" lists the models and reports success or the error in plain words, including the CORS hint below.

## Browser access (CORS)

Browsers only allow the app to call a local server that permits its origin.

- **Ollama:** start with `OLLAMA_ORIGINS` including the app's origin, for example `OLLAMA_ORIGINS="http://localhost:5173,http://localhost:4173"`, or the hosted site's origin.
- **LM Studio:** enable CORS in the server settings.
- **Other servers:** see their documentation for allowing cross-origin requests.

When a request fails in a way that looks like CORS (a `TypeError` from `fetch` with no response), Settings shows these instructions.

## Modes

### 1. Lesson text

Generates sentences for the current lesson.

- Input: allowed characters, the weakest characters (top 5), language, target length.
- Prompt asks for natural words using only allowed letters, favouring the weak ones.
- Output is always validated; models are unreliable at character restrictions, so expect to discard words.
- Useful mostly from the middle of the letter track on. Before that, the offline generator is usually better, so this mode is only used once at least 12 letters are unlocked.

### 2. Learn a topic

The learner types a topic (for example "how vaccines work" or "Rust ownership"), and the model writes a series of short teaching passages, each building on the last.

- Available once all letters of the layout are unlocked, plus punctuation if the topic text needs it (otherwise punctuation is stripped).
- Passages are 40–80 words. The next one is requested as soon as the current one is shown, with a short summary of previous passages for continuity.
- After every 3rd passage, an optional one-line recap question is shown (not typed) under the session feedback.
- The topic history is kept locally so the learner can continue later.

### 3. Code snippets

- Input: programming language, allowed symbols, length.
- Output: one realistic snippet, 3–12 lines, no comments longer than one line.
- Validated for allowed characters; indentation is normalized to spaces.

### 4. Session feedback

- Input: session statistics only: WPM, accuracy, weakest characters and fingers, trend over the last sessions.
- Output: two or three plain sentences of advice.
- Offline equivalent: a rule-based summary such as "Your weakest keys were ř and č, both on your left index finger. Slow down on the number row."

## Prompts

One file per mode in `src/ai/prompts/`, each exporting a function `(input) => GenerateRequest`. Prompts are written in the target language (English or Czech), request plain text only (no Markdown, no lists, no quotes around the answer) and include a short example of the desired output.

Prompts are part of the product. Changes to them should be tested against at least two small local models and noted in the pull request.

## Validation (`validate.ts`)

Applied to all generated text:

1. Unicode NFC normalization, trim, collapse whitespace (except newlines in code mode).
2. Strip Markdown artifacts: backticks, asterisks, leading list markers, surrounding quotes.
3. Replace typographic characters with typable ones: curly quotes → straight, en/em dash → `-`, ellipsis → `...`, non-breaking space → space.
4. For lesson text: remove every word that contains a character not in the allowed set. If fewer than 60 % of the words survive, discard the result and use offline text.
5. For topic text: characters that the current layout can't produce are transliterated (for example `ß` → `ss`) or the word is removed.
6. Length clamp to the requested range.

`validate(raw, options)` returns the cleaned text or `undefined` (use offline content). Beyond the rules above, it drops a leading preamble line ending in `:`, and in code mode takes the first fenced block and discards the snippet if any character is untypable. Lengths are in characters; text over the maximum is cut at the last word (or line) boundary, text under the minimum is discarded.

Validation is pure and lives conceptually with `core/text` rules; it has thorough unit tests with real messy model output as fixtures in `tests/fixtures/ai/`.

## Testing

- Unit tests use a fake `TextProvider` that yields scripted chunks, including malformed ones, slow ones and failures.
- No test requires a running model server.

## Model prefetching

Setup: as for Model modes, with a lesson that uses a model mode (for example lesson text from lesson 7).

1. Slow server (add a delay, or load a large model cold): finish a session and click Next at once. The next session starts immediately with offline text and no wait. Wait a few seconds, finish it and click Next: the text is from the model.
2. Change the lesson, switch layout or unlock a letter while a request is running: DevTools Network shows the old request cancelled and a new one for the new lesson.
3. Stop the server and keep practising: no error, no delay at any session start, offline text throughout.
4. While a stream is running, type steadily: input stays smooth and the passage does not flicker or re-render.

Pass: no session start ever waits for the model, stale requests are cancelled, and typing stays smooth.
