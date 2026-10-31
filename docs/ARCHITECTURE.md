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
  base: string            // "" for keys that type nothing (Shift, CapsLock, Backspace)
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

Helpers derived once per layout and cached (`core/layouts/strokes.ts`):

- `strokesFor(layout, char): readonly Stroke[] | undefined`, where `Stroke = { code, shift: 'ShiftLeft' | 'ShiftRight' | null }`. It returns the key presses that produce a character (one key, key plus opposite-hand Shift, or dead key then key), and `undefined` when the layout can't produce it. A dedicated key or the unshifted layer wins over a shifted or composed path. Used for finger guidance, for deciding whether a character is "unlocked", and for per-key stats.
- `fingerFor(layout, code): Finger | undefined`.

The full key data and finger map are specified in [LAYOUTS.md](LAYOUTS.md).

### `core/engine`

A typing session is a pure state machine. No timers inside it; time is passed in. A timed session ends through `expire(session, at)`: once `at - startedAt >= timeLimit` it sets `finishedAt = startedAt + timeLimit` (so duration equals the limit) and returns true; `apply` calls it first and drops a key that arrives after the limit. The UI owns the clock: one 250 ms interval in the Practice view, which skips ticks while paused and subtracts paused time like keystroke times.

```ts
type ErrorMode = 'stop' | 'continue'

interface SessionConfig {
  text: string
  errorMode: ErrorMode
  timeLimit?: number                              // ms from the first key; timed sessions only
}

type InputEvent =
  | { kind: 'char'; char: string; at: number }    // at = event.timeStamp minus time spent paused, in ms
  | { kind: 'backspace'; at: number }

interface CharState {
  expected: string
  typed?: string
  status: 'pending' | 'correct' | 'corrected' | 'wrong' | 'skipped'
}

interface Session {
  config: SessionConfig
  chars: CharState[]
  cursor: number
  furthest: number        // highest cursor reached; an index below it was attempted before, so a right entry there is `corrected`
  startedAt?: number
  finishedAt?: number
  lastKeyAt?: number      // last key that changed the session, Backspace included; sincePrevious measures from it
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
- **continue mode:** a wrong character is marked `wrong` and the cursor advances. Backspace moves back one and resets that character to `pending`; a later correct entry there becomes `corrected`. At the start of an indented line it hops over the skipped run to the newline, resetting the run and the newline to `pending`. Backspace can move back across words, but not before index 0.
- The session starts on the first keystroke and finishes when the cursor passes the last character. In stop mode the cursor only passes a character once it is typed right, so no `wrong` characters remain. In continue mode, reaching the end of the text always finishes the session, even with `wrong` characters left; the errors simply count.
- Newlines in code are typed with Enter. Leading indentation after a newline is skipped automatically, so the learner types code content, not spaces. Spaces and tabs both count as indentation, and passing the newline triggers the skip, even with a wrong key in continue mode.
- Skipped characters get the status `skipped`, have no log entry and count in no result. If the skip reaches the end of the text, the session finishes on that keystroke.
- On a whitespace-only line only the whitespace is skipped, so the learner still presses Enter for it.
- Indentation at the very start of the text is not skipped. Snippet sources should be dedented so it does not arise.
- There is no code-mode switch: the engine always applies these rules. Non-code text never holds a newline.
- Unicode form: `createSession` normalizes the text to NFC, once per passage, and `src/input/` normalizes `event.data` to NFC before building the `InputEvent`. `apply` compares exactly, so nothing is added to the keystroke path. Characters arriving as two separate events (`c`, then U+030C) are not handled. `config.text` keeps the text as the caller passed it.

Derived results are pure functions over the session. WPM uses the standard five characters per word, and minutes come from the duration.

- **Duration:** `finishedAt - startedAt` when finished, `lastKeyAt - startedAt` when unfinished, 0 when unstarted.
- **Gross WPM:** `log.length` / 5 / minutes.
- **Net WPM:** (`correct` + `corrected` characters) / 5 / minutes.
- **Accuracy:** positions whose first attempt was correct / positions attempted, as a fraction from 0 to 1.
- WPM is 0 with no attempts or zero duration. Accuracy is 0 with no attempts. Values stay unrounded in `core/`.

Errors per character is also derived from the session.

### `core/stats`

Per-key statistics are keyed by **character**, and also aggregated by **physical key** and **finger** using `strokesFor`.

For each character, `foldSession` (`core/stats/chars.ts`) folds a finished session's log into an exponentially weighted moving average of:

- accuracy: 1 or 0 per attempt. An attempt is the first keystroke at a text position, the same one session accuracy counts; retries at a position (stop mode, or after Backspace) are not attempts.
- time to press: `sincePrevious` of correct attempts, skipping the session's first keystroke and pauses over 2 s, which count as hesitation not speed.

Smoothing factor `α = 0.1` per attempt, in log order; a character's first sample sets its average, so recent sessions dominate without one bad session wiping progress. Raw counts are stored too (`attempts`, `correct`, `timed`, `totalMs`) so the averages can be recomputed if the formula changes. Only finished sessions are folded, once, when the session ends; nothing is added to the keystroke path.

### `core/adaptive`

Three decisions:

1. **Which words to show.** `weakness(stat)` (`core/adaptive/weakness.ts`) is 0 to 1: the mean of an accuracy gap `1 - 0.05 / errorRate` and a speed gap `1 - targetMs / ms` (each 0 at or better than target, 1 with no timed samples), blended toward 1 by `min(1, attempts / 30)`, so unseen and newly unlocked characters count as fully weak. A word weighs `0.25 + Σ weakness(char)` over its characters; words are sampled by cumulative weight. A drawn word that is one of the previous 8 is redrawn up to 10 times. Pseudo-word letters are weighted by `0.25 + weakness`. Targets come from Settings: `weakness(stat, targets)`.
2. **When to unlock the next key.** All currently unlocked characters must meet the targets (defaults: 95 % accuracy and 35 WPM equivalent speed, both configurable) over at least 30 attempts in total, judged by the moving averages. A character meets the targets when its weakness is 0. Each track checks its own unlocked characters after the session's stats are folded, at most one stage per session. The next key is the next one in the lesson order for the current layout.
3. **Session feedback.** `weakestKeys(layout, stats, chars, targets, n)` (`core/adaptive/feedback.ts`) ranks the distinct non-whitespace characters typed in the session by `weakness`, drops those at 0, maps each to the main key code of its `strokesFor` path (merging `a` and `A`) and returns up to `n` codes; the UI turns codes into labels. `feedbackSentence({ wpm, accuracy, targets, weakest, unlocked })` returns one sentence by the rule list in DESIGN.md. Pure and deterministic; a model-written summary (AI.md mode 4) replaces only the sentence.

### `core/lessons`

- The unlock order per layout (see LAYOUTS.md), as `unlockedLetters(layoutId, stage)`; a stage is one row of the order, and Space is always allowed. Layouts without an order yet (`cs-qwertz`, milestone 8) return `undefined`.
- Content types, each selectable: `words`, `punctuation` (adds capitals and punctuation to word text), `numbers`, `code`. Punctuation and numbers have their own unlock tracks that start after the letter track reaches a configurable point.
- A "free practice" mode with everything unlocked.

### `core/text`

Offline text generation:

- Word lists are frequency-ordered plain text, one word per line, loaded lazily per locale.
- `generate(...)` returns a passage. It filters words to those typable with allowed characters, then samples with `adaptive` weights.
- When too few words fit (early lessons), it falls back to pseudo-words built from allowed letters using the language's common bigrams, so the first lesson is not "jjj fff".
- Randomness comes from an injected seeded RNG (`seededRng(seed)`, mulberry32), so tests are deterministic.
- `generate({ words, allowed, stats, length, rng })` takes the loaded word list as an argument; `core/` never fetches. `stats` (per-character stats, default none) weights sampling via `core/adaptive`. Fallback rule: fewer than 100 distinct fitting words (`MIN_WORDS`) means the whole passage is pseudo-words. Pseudo-words are 3 to 5 letters, built letter by letter from pair counts over the whole word list with add-one smoothing, so any allowed letter set works. Each candidate letter's pair weight is divided by its total incoming pair mass within the allowed set, so pairs decide which letter follows which but not how often a letter appears (raw counts made the first lesson almost all `f`); the first letter is drawn by weakness alone.

- `generateContent({ type, words, snippets, letters, stats, stage, length, rng })` (`core/text/content.ts`) dispatches on content type; words and punctuation are weighted by `stats`, numbers and code are not; `stage` is the stage within that type's track (`core/lessons/tracks.ts`: `tracksOpen`, `trackChars`, `trackStages`). Tracks open at letter step 8 for `en-us` and 10 for `cs-qwertz`.
- **Punctuation** (4 stages: capitals; `. ,`; `? ! ' " : ; -`; brackets): word text is cut into sentences of 3 to 7 words. Each sentence starts with a capital, ends with a mark chosen from the unlocked `. ? !` (the passage ends with `.`), and unlocked marks are applied to a word with about 10 % chance each (`,` 20 %; `-` joins two words; `'s` only when `s` is unlocked).
- **Numbers** (2 stages: `1`-`5`; all digits): `length` groups of 1 to 4 digits separated by spaces.
- **Code** (4 stages, symbols as in LAYOUTS.md; `.` and `,` are not code symbols, so snippets avoid them, and digits): uses all lowercase letters regardless of the letter track, since identifiers need them. Stages 1 to 3 type single snippet lines (at least 4 characters, only symbols unlocked so far), about `length / 5` of them joined by spaces; stage 4 types whole snippets joined with `\n`.
- **Snippets:** `src/data/code/<lang>.txt`, plain text, snippets separated by a blank line, dedented, two-space indents, no tabs. `parseSnippets(raw)` splits them. The UI loads them with a dynamic `import("...?raw")`; word lists are fetched through a `?url` asset (`src/ui/content.ts`), so they are emitted as `.txt` files that `size-check` budgets.

### `core/settings`

A single versioned `Settings` object with defaults and a `migrate(old)` function. Includes: layout, error mode, content types, session length (`words` count or `seconds`), live stats visibility, targets, appearance override, reduce motion, model server config.

Session length options: 15, 30 or 60 words, or 30, 60 or 120 seconds. A timed session starts its clock at the first keystroke and generates `seconds * 4` words (240 wpm), so the text does not run out; if it does, the session ends with the text. Defaults: `en-us`, `stop`, `words`, 30 words, live WPM hidden, appearance `system`.

Implemented so far (`core/settings/settings.ts`): `version`, `errorMode`, `length` and `keyboardMode` (finger colours, next key only, hidden; default finger colours) and `reduceMotion` (`system`, `on` or `off`; default `system`, which follows `prefers-reduced-motion`; a missing or unknown value reads as `system`, so no version bump) and `targets` (accuracy 90, 95 or 98 %, speed 20 to 60 wpm; defaults 95 % and 35 wpm). `modelServer` (`baseUrl`, `model`, `apiKey`; strings validated alone, defaults `http://localhost:11434/v1` and empty) is edited in the Settings view (`#settings`, `,`), left out of export, and kept by import. Other fields are added with the feature that reads them. `migrateSettings(unknown)` validates each field alone: a bad or missing field takes its default and the rest are kept. `layout` (`en-us` or `cs-qwertz`, default `en-us`; a missing or unknown value reads as `en-us`, so no version bump) is the layout in use; `core/layouts/registry.ts` lists the layouts. Changing it loads that layout's progress and resets the current lesson to Lesson 1; progress and sessions of the other layouts are untouched.

## Input (`src/input/`)

Character input is read from a visually hidden, focused `<textarea>`:

- `beforeinput` with `inputType` `insertText` gives the character. Call `preventDefault()` and keep the textarea empty. Other input types outside a composition are prevented and ignored.
- During a composition `beforeinput` is ignored and not prevented: it fires for every intermediate state and is not always cancelable. `compositionend.data` gives the final character, including dead-key results like `č`, once. Empty `data` is a cancelled composition and emits nothing. The textarea is cleared there. The character is held until a zero-delay timeout or the next input event, whichever comes first, because Chromium ends a composition on blur by firing `compositionend` with the pending text just before `blur`, in the same task. A pause drops a held character, so a dead key left pending when focus goes types nothing. This is the one timer near the keystroke path, and it runs per composed character only.
- `beforeinput` with `deleteContentBackward` is Backspace.
- `keydown` is used only to highlight the physical key (`event.code`) on the on-screen keyboard and for Enter. Enter types `\n` when the passage holds a newline (`text.includes("\n")`, set per passage by the caller) and otherwise does nothing; it is always prevented, and ignored during a composition. Never read characters from `keydown`: dead keys report `"Dead"` and layouts differ.
- `compositionstart` / `compositionend` are tracked so a pending dead key shows a subtle indicator.
- Losing focus pauses the session and shows "Click or press any key to continue". Focus returning by itself stays paused. A click or a key resumes; the resuming key is prevented and types nothing. Lone modifiers, function keys (`F1` and up) and combinations with Ctrl, Meta or Alt neither resume nor are prevented, so browser shortcuts such as Ctrl+R and F5 keep working. AltGr types characters and resumes, including where it reports as Ctrl+Alt on Windows.
- Pausing and resuming both abandon a running composition, because a browser need not end one when focus leaves. A `compositionend` arriving afterwards emits nothing, and resuming clears the textarea.
- Paused time, ending at the resuming event's `timeStamp`, is held in this module and subtracted from `at`, so the engine and results need no pause concept.
- The caller renders and visually hides the textarea.

This module turns DOM events into `InputEvent`s and nothing more.

## Storage (`src/storage/`)

IndexedDB database `tenfold`, versioned with explicit upgrade steps.

| Store | Key | Contents |
|---|---|---|
| `settings` | `'current'` | `Settings` |
| `progress` | layout id | unlocked characters per track, per-character stats |
| `topics` | topic text | Learn a topic history: `{ count, passages }`, newest 6 passages |
| `sessions` | auto | summary of each finished session: date, layout, mode, WPM, accuracy, duration, per-character error counts |

Upgrades are an ordered list in `src/storage/migrations.ts` (versions 1, 2, 3, ... with no gaps); the database version is the list length and `onupgradeneeded` runs every step newer than `oldVersion`. Version 1 creates `settings`, `progress` and `sessions`, all with out-of-line keys (`sessions` uses an auto-increment key); version 2 adds `topics`, which is not exported and not touched by import. A failed step aborts the upgrade transaction. Connections close on `versionchange` so another tab can upgrade.

`openDatabase()` resolves `null` when IndexedDB is missing, errors (private mode) or is blocked by an older tab. Callers then run memory-only: the app works, nothing persists.

`settings` holds the object under `'current'`. `progress` holds `{ letters, punctuation, numbers, code, stats }` under the layout id: the unlocked stage count per track and the per-character stats. `parseProgress` resets a bad track to 1 and clamps to the stage count; it drops invalid stats entries and keys that are not one character, and reads missing stats as `{}`, so progress saved earlier needs no migration. A `sessions` record (`core/engine/record.ts`) is `{ at, layout, mode, lesson, wpm, accuracy, durationMs, errors }`, where `wpm` is net and `errors` counts wrong keystrokes per expected character. `src/storage/store.ts` loads settings and then the progress of the saved layout once at startup (the word list for that layout loads after it, alongside the snippets), `readProgress(layout)` reads another layout's progress when the layout is switched or exported, and exposes fire-and-forget saves that queue in memory (`src/storage/queue.ts`); with no database nothing is read or saved. `readSessions()` on the store flushes queued writes, reads all `sessions` and passes each through `parseSessionRecord` (`core/engine/record.ts`), which drops invalid records instead of throwing; the Stats view calls it when it opens, never on the keystroke path.

Raw keystroke logs are **not** stored long term; they are folded into stats at the end of a session.

Writes happen when a session finishes, or when the page is hidden (`visibilitychange`), never per keystroke. Saves go into a write queue: settings and progress keep only the latest value, session records are appended. A flush is scheduled with `requestIdleCallback` with a 2000 ms timeout so a page that never idles still saves (`setTimeout(0)` fallback) after the first save of a burst, so settings changes and session finishes both stay off the critical path, and runs at once on `visibilitychange` to hidden and on `pagehide`. A failed write stays queued and is retried by the next flush; nothing retries on its own. Callers pass `$state.snapshot` copies, so later mutations cannot change queued data.

### Export and import

Export produces one JSON file:

```json
{ "app": "tenfold", "schema": 1, "exportedAt": "…", "settings": {…}, "progress": {…}, "sessions": […] }
```

Import is a full replace, not a merge: settings, progress and every session are swapped for the file's. `parseExport(unknown)` (`core/export/export.ts`) returns `{ ok, value, droppedSessions }` or `{ ok: false, reason }`. It rejects a file that is not a Tenfold export, has no integer `schema` of at least 1, has a `schema` newer than the app, or has no `sessions` array. Settings and progress repair themselves field by field (`migrateSettings`, `parseProgress`; both layouts' progress is read, one record per layout id); per-character stats travel inside progress, and a file without them imports with empty stats, so adding them kept schema 1; invalid sessions are dropped and counted. There is no older schema than 1, so no migration step exists yet; it goes into `parseExport` with schema 2. Model server settings are excluded from export.

The UI (`ui/components/DataTransfer.svelte`, at the bottom of the Stats view) reads the chosen file only if it is at most 5 MB, parses it and shows a modal `<dialog>` with the counts of what is replaced and what is skipped before anything is written. `Store.replaceAll` discards queued writes, then clears and fills the three exported stores in one readwrite transaction, so a failure changes nothing, and memory is updated only after it succeeds. With no database the import updates memory only and says so; sessions have no in-memory home, so they are not kept. Export downloads `tenfold-YYYY-MM-DD.json` through a Blob and object URL.

## Model integration (`src/ai/`)

Loaded with a dynamic `import()` only when a model server is configured. Specified in [AI.md](AI.md).

## UI (`src/ui/`)

Views: **Practice** (default), **Lessons** (unlock progress per track), **Stats** (history and per-key heatmap), **Settings**. View switching is a `$state` value in `App.svelte`, mirrored to `location.hash` so Back works. No router library.

The Practice view keeps its session in `$state.raw` and replaces it only for a new passage, so keystrokes mutate plain data and nothing reactive sees them. It calls `TextView.update(change)` once per `apply`. `App.svelte` passes the passage and the error mode from Settings as props, and the view detaches input as the session finishes, because removing the focused textarea fires a blur during Svelte's update.

Components get data through props. Shared app state lives in one module with `$state` runes (`src/ui/state.svelte.ts`), not in a global store library.

Design rules are in [DESIGN.md](DESIGN.md).

## Offline and install

`public/sw.js` is a hand-written service worker: cache the app shell on install, serve cache-first, update in the background, and show "Update available" when a new version is waiting. Word lists and fonts are cached when first loaded. No plugin.

`scripts/stamp-sw.mjs` runs after `vite build` and writes the shell file list and a content-hash version into `dist/sw.js`, so the file changes bytes on every new build and browsers see the update. Every same-origin GET is cache-first in the versioned cache; other requests (model server calls are POST or cross-origin) are never touched. A new worker waits; `src/ui/worker.svelte.ts` shows "Update available" and on click posts `skip-waiting`, then reloads when the new worker takes control. The worker is registered only in production builds, after `load`. The build uses `base: "./"` (relative URLs), so it works under a subpath such as `/tenfold/` on GitHub Pages; `.github/workflows/pages.yml` deploys `dist/` on every push to main.

## Browser support

Current and previous major versions of Firefox, Chromium-based browsers, and Safari, plus Firefox ESR. Linux, Windows, macOS. Tablets with a hardware keyboard are supported. On touch-first devices (`(pointer: coarse) and (hover: none)`), the practice view shows a short "Connect a keyboard to practice" message. It disappears as soon as a `keydown` with a physical `event.code` arrives, so a tablet with a keyboard works normally. On-screen keyboards often send `keydown` with `code` empty or `"Unidentified"`; those don't count.
