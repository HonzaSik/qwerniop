# Roadmap

Each milestone is small enough to finish and review in one sitting, and ends with `pnpm check && pnpm test && pnpm build` passing. Tick items as they land.

## 1. Project setup

While milestone 1 is in progress, the `check`, `test` and `build` scripts are added step by step. Verify each item with the tools it adds (for example `pnpm exec vite build`, `pnpm exec tsc --noEmit`). The rule that every commit passes all three applies from the end of milestone 1.

- [x] Vite + Svelte 5 + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) with no template leftovers: no demo components, no sample assets, no counter. Creates `index.html`, `src/main.ts` and an empty `src/App.svelte` as the entry point described in ARCHITECTURE.md. Pins the pnpm version in the `packageManager` field.
- [x] Biome configured; verify `.svelte` support, add `svelte-check` for components
- [x] Vitest with one passing test
- [x] `scripts/size-check.mjs` enforcing the budgets in PERFORMANCE.md
- [x] Import boundary check: `src/core/` imports nothing outside itself
- [x] `package.json` scripts: `dev`, `build`, `preview`, `check`, `test`, `test:bench`
- [x] GitHub Actions workflow running check, test, build on pushes and pull requests
- [x] `App.svelte` rendering the app name with tokens.css applied, in light and dark

**Done when** a clean clone runs `pnpm install && pnpm check && pnpm test && pnpm build` with no warnings.

## 2. Typing engine

- [x] `core/engine` as specified in ARCHITECTURE.md, both error modes
- [x] Results: gross WPM, net WPM, accuracy, duration
- [x] Code-mode newline and indentation handling
- [x] Tests covering: correct run, errors in both modes, Backspace at start, finish rules, Unicode (Czech characters), newline skipping
- [x] Benchmark with baseline recorded

## 3. Practice view

- [x] `src/input/` with hidden textarea, `beforeinput`, composition, focus loss pausing
- [x] Text view rendering spans once per passage; per-character updates through an action
- [x] Caret moved by transform, line scrolling
- [x] Fixed English passage, end-of-session summary
- [x] Frame-time check at 6× throttling in Chromium and Firefox (PERFORMANCE.md)

## 4. Layouts and keyboard

- [x] `en-us` layout data, verified against XKB
- [x] `strokesFor`, `fingerFor` with tests
- [x] On-screen keyboard component from layout data, ANSI geometry
- [x] Next-key highlight, opposite Shift, pressed and wrong flashes
- [x] Keyboard display modes: finger colours, next key only, hidden

## 5. Lessons and offline text

- [x] Word list for English with license recorded in `src/data/SOURCES.md`
- [x] Normalization script in `scripts/`
- [x] Letter track unlock order, pseudo-word fallback for early lessons
- [x] Content types: words, punctuation and capitals, numbers, code (with built-in snippets)
- [x] Session length setting: word count or timer
- [x] Lessons view showing progress

## 6. Storage and stats

- [x] IndexedDB wrapper with versioned upgrades
- [x] Settings, progress, sessions stores
- [x] Deferred saving, flush on `visibilitychange`
- [x] Stats view: history chart of WPM and accuracy (plain SVG, no chart library), per-key heatmap on the keyboard
- [x] JSON export and import with validation, migration and confirmation

## 7. Adaptive practice

- [x] Per-character EWMA stats
- [x] Weighted word sampling toward weak characters
- [x] Unlock rule with configurable targets
- [x] Offline session feedback sentences
- [x] Tests with simulated learners (strong, weak on one key, inconsistent)

## 8. Czech

- [x] `cs-qwertz` layout data, ISO geometry, verified against XKB `cz`
- [x] Dead-key composition and stroke mapping, preferring dedicated keys
- [x] Czech word list with license recorded
- [x] Czech lesson order including number-row letters
- [x] Layout switcher; progress kept per layout
- [x] Czech UI strings

## 9. Polish

- [x] Design pass against DESIGN.md in both appearances
- [x] Reduce motion setting and system preference
- [x] Full keyboard navigation, focus states, shortcut help sheet
- [x] Screen reader checks (Orca on Linux, VoiceOver on macOS if available)
- [x] Touch-device message
- [x] Service worker, manifest, offline test
- [x] Font subset and preload
- [x] Performance pass: all budgets met, throttled tests in both browsers

## 10. Model integration

- [x] `TextProvider` interface and OpenAI-compatible implementation with streaming
- [x] Settings section with connection test and CORS help
- [x] Validation with fixtures from real model output
- [x] Modes: lesson text, learn a topic, code snippets, session feedback
- [x] Prefetching so the learner never waits; silent fallback
- [x] Confirm the `ai` chunk is not loaded when disabled

## 11. Open-source release

- [x] README screenshots in light and dark
- [x] Issue and pull request templates
- [x] GitHub Pages deployment workflow
- [x] Release notes for 1.0
- [x] Final license and data-source review

## 12. Polish

- [x] Shared control styles in `src/ui/styles/base.css`
- [x] Settings rows with label left, control right; accuracy and speed targets move from Lessons to Settings
- [x] Centred nav with an accent underline for the current view
- [x] Chrome fades while typing (`data-typing`)
- [x] View titles, locked-lesson styling and a fade-in on view change

## 13. Appearance and session options

- [x] Theme: System, Light, Dark, OLED black
- [x] Practice text size, caret style and accent presets
- [x] Error mode and live stats in Settings
- [x] Longer list of session lengths

## 14. Practice calendar

- [x] Minutes practised today in Stats
- [x] Month calendar of practice per day with earlier months and per-day details, all layouts, no streaks

## 15. New-key introduction

- [x] Each new key with its finger and the path from home row before a lesson's first session
- [x] Short drill of only the new keys, then the lesson text

## 16. Polish pass 2

- [x] Keycaps (`kbd`) in the help sheet and for the summary's weakest keys
- [x] Help sheet: tinted backdrop (`--backdrop`), more padding, full-width Close
- [x] "Start typing when ready" before the first key of a session
- [x] Summary: dividers between stats, "Speed" with a small unit, two rows at phone width
- [x] Lessons: "n of m" and a progress bar per track, "Current" on the current lesson
- [x] Hairline edge on the keyboard, one shared `.note` style

## 17. Developer mode

- [x] Setting that makes every lesson startable, without unlocking anything

## 18. Custom text

- [ ] Practise pasted text; counts toward stats and history, never unlocks
