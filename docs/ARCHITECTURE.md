# Architecture

## Principles

1. **The app is complete without a model server.** The optional model integration adds content; it never gates a feature that has an offline equivalent, and a failure there never interrupts typing.
2. **Logic is pure, the UI is thin.** Everything that can be decided without the DOM lives in `src/core/` as plain TypeScript with tests.
3. **Layouts and lessons are data.** Adding a layout or a content type should not require touching the engine.
4. **Input is never blocked.** Nothing on the keystroke path waits on storage, network, or heavy computation. See [PERFORMANCE.md](PERFORMANCE.md).
5. **Small surface, few dependencies.**

## Stack

| Concern | Choice | Notes |
|---|---|---|
| UI | Svelte 5 (runes) | `$state`, `$derived`, `$effect`. No stores unless a value is shared outside components. |
| Build | Vite | Plain Svelte, no SvelteKit. Single-page app. |
| Language | TypeScript, `strict` | Plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. |
| Lint and format | Biome | Verify its `.svelte` support at setup. If insufficient, Biome handles `.ts`/`.json`/`.css` and `svelte-check` handles components. |
| Type check | `tsc --noEmit` and `svelte-check` | |
| Tests | Vitest | Unit tests for `core/`, a few component tests where behavior is non-trivial. |
| Storage | IndexedDB | Through a small typed wrapper in `src/storage/`. |
| Package manager | pnpm | |
| Runtime dependencies | `svelte` only | Anything else needs an issue first. |

## Directory layout

```
src/
  main.ts                 mounts App
  App.svelte              top-level view switch
  core/                   pure TypeScript, no Svelte, no DOM, no imports from ai/ or storage/
    engine/               typing session state machine
    layouts/              layout data and lookup helpers
    lessons/              unlock order, lesson definitions, content types
    text/                 offline text generation from word lists and snippets
    stats/                per-key and per-session statistics
    adaptive/             weak-key weighting and unlock decisions
    settings/             settings type, defaults, validation, migration
  input/                  browser input capture (hidden textarea)
  storage/                IndexedDB wrapper, repositories, export/import
  ai/                     optional model integration, loaded lazily
    provider.ts           TextProvider interface
    openai-compatible.ts  implementation for OpenAI-compatible servers
    validate.ts           enforces allowed characters on generated text
    prompts/              one file per mode
  ui/
    views/                Practice, Lessons, Stats, Settings
    components/           TextView, Keyboard, Caret, StatLine, ...
    styles/               tokens.css, base.css
  data/
    words/                en.txt, cs.txt (frequency-ordered)
    code/                 built-in snippets per language
    SOURCES.md            source and license of every data file
public/
  fonts/                  subset woff2
  sw.js                   hand-written service worker
  manifest.webmanifest
tests/
  bench/                  engine benchmarks
```

Dependency direction is strictly one way:

```
ui  →  input, storage, ai, core
input, storage, ai  →  core
core  →  nothing
```

`core/` importing anything outside itself is a bug. Enforce with a Biome `noRestrictedImports` rule (or a small test that scans imports if Biome can't express it).

## Core modules

### `core/layouts`

A layout is a list of physical keys. Each key:

```ts
type Finger =
  | 'L5' | 'L4' | 'L3' | 'L2'     // left pinky, ring, middle, index
  | 'R2' | 'R3' | 'R4' | 'R5'     // right index, middle, ring, pinky
  | 'T'                            // thumbs

interface KeyDef {
  code: string            // KeyboardEvent.code, e.g. "KeyA", "Digit1", "Semicolon"
  row: 0 | 1 | 2 | 3 | 4  // 0 = number row, 4 = space row
  width?: number          // in key units, default 1
  finger: Finger
  base: string            // character without modifiers
  shift?: string          // character with Shift
  deadBase?: string       // dead key produced without Shift, e.g. "´"
  deadShift?: string      // dead key produced with Shift, e.g. "ˇ"
}

interface Layout {
  id: 'en-us' | 'cs-qwertz'
  name: string
  locale: string          // for word lists and capitalization
  keys: KeyDef[]
  compose: Record<string, Record<string, string>>  // dead key → base → result, e.g. "ˇ" → "c" → "č"
}
```

Helpers derived once per layout and cached:

- `strokesFor(char)` returns the key presses that produce a character (one key, key plus Shift, or dead key then key). Used for finger guidance, for deciding whether a character is "unlocked", and for per-key stats.
- `fingerFor(code)`.

The full key data and finger map are specified in [LAYOUTS.md](LAYOUTS.md).

### `core/engine`

A typing session is a pure state machine. No timers inside it; time is passed in.

```ts
type ErrorMode = 'stop' | 'continue'

interface SessionConfig {
  text: string
  errorMode: ErrorMode
}

type InputEvent =
  | { kind: 'char'; char: string; at: number }    // at = event.timeStamp in ms
  | { kind: 'backspace'; at: number }

interface CharState {
  expected: string
  typed?: string
  status: 'pending' | 'correct' | 'corrected' | 'wrong'
}

interface Session {
  config: SessionConfig
  chars: CharState[]
  cursor: number
  startedAt?: number
  finishedAt?: number
  log: Keystroke[]        // every attempt, for stats
}

interface Keystroke {
  index: number           // position in text
  expected: string
  typed: string
  correct: boolean
  at: number
  sincePrevious: number   // ms since the previous keystroke, 0 for the first
}

function createSession(config: SessionConfig): Session
function apply(session: Session, event: InputEvent): Change
```

`apply` mutates the session in place for speed (see PERFORMANCE.md) and returns a small `Change` describing which character indices changed, so the UI updates only those spans. Tests compare state after sequences of events.

Rules:

- **stop mode:** a wrong character is logged as an error and the cursor stays. The character is marked `wrong` until the right key is pressed, then `corrected`. Backspace does nothing.
- **continue mode:** a wrong character is marked `wrong` and the cursor advances. Backspace moves back one and resets that character to `pending`; a later correct entry there becomes `corrected`. Backspace can move back across words, but not before index 0.
- The session starts on the first keystroke and finishes when the cursor passes the last character. In stop mode the cursor only passes a character once it is typed right, so no `wrong` characters remain. In continue mode, reaching the end of the text always finishes the session, even with `wrong` characters left; the errors simply count.
- Newlines in code are typed with Enter. Leading indentation after a newline is skipped automatically, so the learner types code content, not spaces.

Derived results (pure functions over the session): gross WPM, net WPM, accuracy, duration, errors per character. WPM uses the standard five characters per word.

### `core/stats`

Per-key statistics are keyed by **character**, and also aggregated by **physical key** and **finger** using `strokesFor`.

For each character, keep an exponentially weighted moving average of:

- accuracy (correct first attempts / attempts)
- time to press (`sincePrevious`, excluding pauses over 2 s, which count as hesitation not speed)

Smoothing factor `α = 0.1` per attempt, so recent sessions dominate without one bad session wiping progress. Store raw counts too so the averages can be recomputed if the formula changes.

### `core/adaptive`

Two decisions:

1. **Which words to show.** Each candidate word gets weight `Σ weakness(char)` over its characters, where weakness grows as accuracy drops below target and as speed drops below target. Words are sampled by weight, with a floor so strong keys still appear. Never repeat a word within the same session line.
2. **When to unlock the next key.** All currently unlocked characters must meet the targets (defaults: 95 % accuracy and 35 WPM equivalent speed, both configurable) over at least 30 recent attempts each. The next key is the next one in the lesson order for the current layout.

### `core/lessons`

- The unlock order per layout (see LAYOUTS.md).
- Content types, each selectable: `words`, `punctuation` (adds capitals and punctuation to word text), `numbers`, `code`. Punctuation and numbers have their own unlock tracks that start after the letter track reaches a configurable point.
- A "free practice" mode with everything unlocked.

### `core/text`

Offline text generation:

- Word lists are frequency-ordered plain text, one word per line, loaded lazily per locale.
- `generate({ allowed, weights, length, contentTypes, rng })` returns a passage. It filters words to those typable with allowed characters, then samples with `adaptive` weights.
- When too few words fit (early lessons), it falls back to pseudo-words built from allowed letters using the language's common bigrams, so the first lesson is not "jjj fff".
- Randomness comes from an injected seeded RNG, so tests are deterministic.

### `core/settings`

A single versioned `Settings` object with defaults and a `migrate(old)` function. Includes: layout, error mode, content types, session length (`words` count or `seconds`), live stats visibility, targets, appearance override, reduce motion, model server config.

Defaults: `en-us`, `stop`, `words`, 30 words, live WPM hidden, appearance `system`.

## Input (`src/input/`)

Character input is read from a visually hidden, focused `<textarea>`:

- `beforeinput` with `inputType` `insertText` or `insertCompositionText` gives the final character, including dead-key results like `č`. Call `preventDefault()` and keep the textarea empty.
- `beforeinput` with `deleteContentBackward` is Backspace.
- `keydown` is used only to highlight the physical key (`event.code`) on the on-screen keyboard and for Enter in code mode. Never read characters from `keydown`: dead keys report `"Dead"` and layouts differ.
- `compositionstart` / `compositionend` are tracked so a pending dead key shows a subtle indicator.
- Losing focus pauses the session and shows "Click or press any key to continue".

This module turns DOM events into `InputEvent`s and nothing more.

## Storage (`src/storage/`)

IndexedDB database `tenfold`, versioned with explicit upgrade steps.

| Store | Key | Contents |
|---|---|---|
| `settings` | `'current'` | `Settings` |
| `progress` | layout id | unlocked characters per track, per-character stats |
| `sessions` | auto | summary of each finished session: date, layout, mode, WPM, accuracy, duration, per-character error counts |

Raw keystroke logs are **not** stored long term; they are folded into stats at the end of a session.

Writes happen when a session finishes, or when the page is hidden (`visibilitychange`), never per keystroke.

### Export and import

Export produces one JSON file:

```json
{ "app": "tenfold", "schema": 1, "exportedAt": "…", "settings": {…}, "progress": {…}, "sessions": […] }
```

Import validates the shape, runs migrations if `schema` is older, shows a summary, and asks before replacing current data. Model server settings are excluded from export.

## Model integration (`src/ai/`)

Loaded with a dynamic `import()` only when a model server is configured. Specified in [AI.md](AI.md).

## UI (`src/ui/`)

Views: **Practice** (default), **Lessons** (unlock progress per track), **Stats** (history and per-key heatmap), **Settings**. View switching is a `$state` value in `App.svelte`, mirrored to `location.hash` so Back works. No router library.

Components get data through props. Shared app state lives in one module with `$state` runes (`src/ui/state.svelte.ts`), not in a global store library.

Design rules are in [DESIGN.md](DESIGN.md).

## Offline and install

`public/sw.js` is a hand-written service worker: cache the app shell on install, serve cache-first, update in the background, and show "Update available" when a new version is waiting. Word lists and fonts are cached when first loaded. No plugin.

## Browser support

Current and previous major versions of Firefox, Chromium-based browsers, and Safari, plus Firefox ESR. Linux, Windows, macOS. Tablets with a hardware keyboard are supported. On touch-first devices (`(pointer: coarse) and (hover: none)`), the practice view shows a short "Connect a keyboard to practice" message. It disappears as soon as a `keydown` with a physical `event.code` arrives, so a tablet with a keyboard works normally. On-screen keyboards often send `keydown` with `code` empty or `"Unidentified"`; those don't count.
