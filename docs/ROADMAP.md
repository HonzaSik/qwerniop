# Roadmap

Each milestone is small enough to finish and review in one sitting, and ends with `pnpm check && pnpm test && pnpm build` passing. Tick items as they land.

## 1. Project setup

While milestone 1 is in progress, the `check`, `test` and `build` scripts are added step by step. Verify each item with the tools it adds (for example `pnpm exec vite build`, `pnpm exec tsc --noEmit`). The rule that every commit passes all three applies from the end of milestone 1.

- [x] Vite + Svelte 5 + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) with no template leftovers: no demo components, no sample assets, no counter. Creates `index.html`, `src/main.ts` and an empty `src/App.svelte` as the entry point described in ARCHITECTURE.md. Pins the pnpm version in the `packageManager` field.
- [ ] Biome configured; verify `.svelte` support, add `svelte-check` for components
- [ ] Vitest with one passing test
- [ ] `scripts/size-check.mjs` enforcing the budgets in PERFORMANCE.md
- [ ] Import boundary check: `src/core/` imports nothing outside itself
- [ ] `package.json` scripts: `dev`, `build`, `preview`, `check`, `test`, `test:bench`
- [ ] GitHub Actions workflow running check, test, build on pushes and pull requests
- [ ] `App.svelte` rendering the app name with tokens.css applied, in light and dark

**Done when** a clean clone runs `pnpm install && pnpm check && pnpm test && pnpm build` with no warnings.

## 2. Typing engine

- [ ] `core/engine` as specified in ARCHITECTURE.md, both error modes
- [ ] Results: gross WPM, net WPM, accuracy, duration
- [ ] Code-mode newline and indentation handling
- [ ] Tests covering: correct run, errors in both modes, Backspace at start, finish rules, Unicode (Czech characters), newline skipping
- [ ] Benchmark with baseline recorded

## 3. Practice view

- [ ] `src/input/` with hidden textarea, `beforeinput`, composition, focus loss pausing
- [ ] Text view rendering spans once per passage; per-character updates through an action
- [ ] Caret moved by transform, line scrolling
- [ ] Fixed English passage, end-of-session summary
- [ ] Frame-time check at 6× throttling in Chromium and Firefox (PERFORMANCE.md)

## 4. Layouts and keyboard

- [ ] `en-us` layout data, verified against XKB
- [ ] `strokesFor`, `fingerFor` with tests
- [ ] On-screen keyboard component from layout data, ANSI geometry
- [ ] Next-key highlight, opposite Shift, pressed and wrong flashes
- [ ] Keyboard display modes: finger colours, next key only, hidden

## 5. Lessons and offline text

- [ ] Word list for English with license recorded in `src/data/SOURCES.md`
- [ ] Normalization script in `scripts/`
- [ ] Letter track unlock order, pseudo-word fallback for early lessons
- [ ] Content types: words, punctuation and capitals, numbers, code (with built-in snippets)
- [ ] Session length setting: word count or timer
- [ ] Lessons view showing progress

## 6. Storage and stats

- [ ] IndexedDB wrapper with versioned upgrades
- [ ] Settings, progress, sessions stores
- [ ] Deferred saving, flush on `visibilitychange`
- [ ] Stats view: history chart of WPM and accuracy (plain SVG, no chart library), per-key heatmap on the keyboard
- [ ] JSON export and import with validation, migration and confirmation

## 7. Adaptive practice

- [ ] Per-character EWMA stats
- [ ] Weighted word sampling toward weak characters
- [ ] Unlock rule with configurable targets
- [ ] Offline session feedback sentences
- [ ] Tests with simulated learners (strong, weak on one key, inconsistent)

## 8. Czech

- [ ] `cs-qwertz` layout data, ISO geometry, verified against XKB `cz`
- [ ] Dead-key composition and stroke mapping, preferring dedicated keys
- [ ] Czech word list with license recorded
- [ ] Czech lesson order including number-row letters
- [ ] Layout switcher; progress kept per layout
- [ ] Czech UI strings

## 9. Polish

- [ ] Design pass against DESIGN.md in both appearances
- [ ] Reduce motion setting and system preference
- [ ] Full keyboard navigation, focus states, shortcut help sheet
- [ ] Screen reader checks (Orca on Linux, VoiceOver on macOS if available)
- [ ] Touch-device message
- [ ] Service worker, manifest, offline test
- [ ] Font subset and preload
- [ ] Performance pass: all budgets met, throttled tests in both browsers

## 10. Model integration

- [ ] `TextProvider` interface and OpenAI-compatible implementation with streaming
- [ ] Settings section with connection test and CORS help
- [ ] Validation with fixtures from real model output
- [ ] Modes: lesson text, learn a topic, code snippets, session feedback
- [ ] Prefetching so the learner never waits; silent fallback
- [ ] Confirm the `ai` chunk is not loaded when disabled

## 11. Open-source release

- [ ] README screenshots in light and dark
- [ ] Issue and pull request templates
- [ ] GitHub Pages deployment workflow
- [ ] Release notes for 1.0
- [ ] Final license and data-source review