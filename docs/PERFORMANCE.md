# Performance

Tenfold must feel instant on weak hardware: old laptops, Chromebooks, a Raspberry Pi 4, low-end Windows machines. Performance is a requirement from the first milestone, not a polish step.

## Budgets

| Metric | Budget | Checked by |
|---|---|---|
| Keystroke to painted frame | < 16 ms at 6× CPU throttling | Manual check per milestone (DevTools Performance panel) |
| Engine `apply` | < 0.05 ms per event | `tests/bench/engine.bench.ts` |
| Initial JS (gzip) | ≤ 50 KB | `scripts/size-check.mjs` in CI |
| Initial CSS (gzip) | ≤ 10 KB | same |
| Font (woff2, subset) | ≤ 60 KB | same |
| Word list per locale (gzip) | ≤ 60 KB, loaded lazily | same |
| Model integration chunk | loaded only when configured | build output check |
| Stats view chunk | loaded on first visit to Stats | manual, DevTools Network panel |
| Time to interactive, cold, throttled "Slow 4G" + 4× CPU | < 2 s | Lighthouse, manual |

A failing budget fails CI. Raising a budget needs a reason in the pull request.

## The keystroke path

This is the only hot path. Everything on it must be cheap and predictable.

1. `beforeinput` on the hidden textarea → `InputEvent` (no allocation beyond the event object).
2. `engine.apply(session, event)` mutates the session in place and returns which indices changed.
3. The UI updates only those character spans by toggling a class, and moves the caret.

Rules:

- **Render text once per passage.** The passage becomes one `<span>` per character when it is shown. Keystrokes never re-render the list. In Svelte, the spans are rendered from a non-reactive array; per-character status is applied through a small imperative action (`use:charStatus`) that sets `className` on changed spans. Do not make the per-character array deeply reactive.
- **Caret moves with `transform: translate3d()`.** Its position comes from the offsets of the target span, measured once per line when the line is laid out, not on each keystroke. Never read layout (`offsetLeft`, `getBoundingClientRect`) and then write styles in the same keystroke handler.
- **No storage, no network, no `JSON.stringify` on keystrokes.** Keystrokes append to an in-memory array.
- **No timers per keystroke.** Live WPM (if shown) updates at most every 500 ms from a single `requestAnimationFrame` loop that stops when idle.
- **Keyboard highlight** toggles one class on the previous and next key elements. The keyboard DOM is static.
- **Line scrolling** happens only when the caret moves to a new line, using `transform` on the text container.

## Loading

- Svelte compiles to small output; keep it that way by not adding UI libraries.
- Dynamic `import()` for: word list per locale, code snippets, model integration, Stats view, import/export.
- One font file, subset with `pyftsubset` or `glyphhanger` to the characters the layouts and code mode need. `font-display: swap`. Preload it.
- No CSS framework. Component styles are scoped and small; `tokens.css` and `base.css` are global.
- Build target: `es2022`. No polyfills.

## Background work

- Saving stats and session summaries: at session end, deferred with `requestIdleCallback` (fallback `setTimeout(fn, 0)` where unavailable). Also flushed on `visibilitychange` → `hidden`.
- Text generation for the next passage starts while the current passage is being typed, in idle time.
- Model requests stream with `fetch` and run entirely async; validation of generated text is linear in its length and runs off the keystroke path.

## Memory

- Keystroke logs are discarded after being folded into stats.
- Session history is stored as summaries, not raw events.
- Word lists are parsed once into arrays and indexed by character set; the index is built lazily on first use per lesson.

## Checking

Per milestone that touches the UI:

1. `pnpm build && pnpm preview`.
2. Chrome DevTools → Performance → CPU 6× slowdown. Record 20 s of fast typing. No frame over 16 ms caused by our code; no layout shift.
3. Repeat the typing test in Firefox (see `docs/MANUAL_CHECKS.md`; no DevTools CPU throttle there).
4. `pnpm test:bench` shows no regression over 20 % against the last recorded numbers in `tests/bench/BASELINE.md`.
