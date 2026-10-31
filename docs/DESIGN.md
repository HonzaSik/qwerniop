# Design

The goal is a quiet, precise tool in the spirit of Apple's Human Interface Guidelines: content first, clear hierarchy, nothing decorative that doesn't help. The text you type is the visual centre of the app; everything else steps back.

## Principles

1. **Clarity.** One primary action per screen. Labels are short and literal.
2. **Deference.** Chrome recedes while typing. During a session, everything except the text, caret and (optionally) the keyboard fades to low contrast.
3. **Depth through restraint.** Hierarchy comes from size, weight and spacing, not from boxes, borders and shadows.
4. **Consistency.** Every value comes from tokens. No one-off colours, sizes or durations in components.

## What we don't do

- No gradients, glows, glassmorphism or neon.
- No emoji or decorative icons. Icons only where they replace a word clearly (settings, back), drawn as simple 1.5 px stroke SVGs.
- No card grids, no badges, no confetti, no streak flames.
- No colour as the only signal: errors are red *and* underlined; finger colours are paired with position.
- No layout shift while typing.

## Typography

- **Interface:** `system-ui, -apple-system, "Segoe UI", Cantarell, "Noto Sans", sans-serif`. On Linux this resolves to the desktop font (Cantarell, Inter, Noto). Apple's SF fonts can't be redistributed, so they are never bundled.
- **Practice text:** JetBrains Mono (OFL), bundled as a subset `woff2` covering Latin, Latin Extended-A (Czech) and code symbols. Monospace keeps the caret motion even and the line length predictable.
- **Scale (rem):** 0.8125, 0.9375, 1.0625, 1.375, 2. Practice text uses 1.375–1.75 depending on viewport.
- **Weights:** 400 and 600 only (`--weight-regular`, `--weight-semibold`).
- Tabular numerals (`font-variant-numeric: tabular-nums`) for all stats.

## Colour

Defined in `src/ui/styles/tokens.css` as custom properties, with a light set and a dark set. Appearance follows `prefers-color-scheme` unless the user overrides it in Settings (`data-theme` on `<html>`).

| Token | Role |
|---|---|
| `--bg` | Window background |
| `--surface` | Raised areas such as the keyboard and settings groups |
| `--text` | Primary text |
| `--text-2` | Secondary text, labels |
| `--text-3` | Untyped practice text, disabled |
| `--separator` | Hairlines |
| `--accent` | Caret, focus ring, primary button, next key |
| `--correct` | Typed correctly (close to `--text`, not green) |
| `--error` | Wrong character |
| `--error-bg` | Wrong character background tint |

Values (contrast ratios measured against `--bg`; `--text-3` is at least 4.97:1 on `--surface` too, `--error` on `--error-bg` is 4.89:1 light and 5.40:1 dark):

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#ffffff` | `#1c1c1e` |
| `--surface` | `#f2f2f7` | `#2c2c2e` |
| `--text` | `#1c1c1e` (17.0) | `#f2f2f7` (15.3) |
| `--text-2` | `#545458` (7.5) | `#aeaeb2` (7.7) |
| `--text-3` | `#68686d` (5.5) | `#9a9aa0` (6.1) |
| `--separator` | `#d1d1d6` | `#3a3a3c` |
| `--accent` | `#0a64c8` (5.7) | `#4d9bff` (6.0) |
| `--correct` | `#1c1c1e` | `#f2f2f7` |
| `--error` | `#c4271d` (5.8) | `#ff7b72` (6.8) |
| `--error-bg` | `#fde8e6` | `#4a2220` |

Typed-correct text is shown as normal primary text and untyped text as `--text-3`; the contrast between the two is the progress indicator. Green is not used for "correct", only red for "wrong". One accent hue (a calm blue) across the app.

Finger colours for the keyboard are eight muted hues with matching lightness, defined separately in light and dark. They are only shown on the keyboard, never in the text.

All text and essential UI must meet WCAG AA contrast in both appearances. `--text-3` against `--bg` must stay at or above 4.5:1 for the practice text size.

## Spacing and layout

- 4 px base unit; spacing tokens `--space-1` … `--space-8` = 4, 8, 12, 16, 24, 32, 48, 64 px.
- Corner radius: 8 px for controls, 12 px for groups, 6 px for keys.
- Practice view: text column centred, max width about 64 characters; keyboard below with generous space between.
- Settings: grouped lists like system preferences, one setting per row, label left and control right.
- Responsive down to 360 px width; the keyboard scales by key unit, never scrolls horizontally.

## Practice view

```
                         Lesson 5 · e i                        (text-2, fades during typing)

        fed jade sled side idea dial lid fiddle aid jail
        feel deal slide                                         (text-3 until typed)
              ▏                                                 (caret, accent)

                   [ on-screen keyboard, next key in accent ]

                      42 wpm · 97 %                             (only if live stats on)
```

- Caret is a 2 px bar that glides to the next character with a short transform transition. Its blink pauses while typing.
- Three lines of text are visible at all times, including for shorter passages, at a line height of 1.6; the view scrolls by whole lines, without animation if reduce motion is on.
- The caret stays on the middle row after the first line. Near the end the scroll stops so the last three lines stay filled, and the caret drops to the bottom row: `top = max(0, min(line - 1, lineCount - 3))`. Backspace uses the same rule. At the end of the text the caret sits after the last character, with no extra line.
- Layout is a Settings field, saved when changed; until the Settings view exists it is chosen with a select beside Length at the top right of the Practice view. Switching keeps each layout's progress and starts at Lesson 1 with that layout's own saved progress; Lessons, Stats and the keyboard follow the layout in use.
- Timed sessions show the seconds left in `text-2`, tabular numerals, centred above the text; it updates once a second and is outside the text view. The length is a Settings field, saved when changed; until the Settings view exists it is chosen with a select at the top right of the Practice view (`App.svelte`). Pausing (blur) stops the clock.
- End of session: text fades out and a summary appears in place: WPM, accuracy, time, weakest keys, a sentence of feedback, and "Continue" (Enter) / "Repeat" (R).
  - WPM is net WPM, as a whole number. Accuracy is a whole percent that shows 100 % only for a session with no errors. Time is `m:ss`.
  - Weakest keys: up to three physical keys (`weakestKeys`, `core/adaptive/feedback.ts`). Candidates are the characters attempted this session, ranked by the weakness the weighted sampling defines on the stats after this session is folded (the stats the unlock rule judges); characters with weakness 0 and Space are left out, and a character maps to its main key via `strokesFor`, so `a` and `A` are one key. Shown as key labels in a "Weakest keys" row; with none, the row is omitted. A single session's error count is not what "weakest" means here, and there is no comparison with past sessions and no finger names.
  - Feedback sentence (offline, `feedbackSentence`), first rule that applies: a newly unlocked lesson ("Lesson 6 · r u is unlocked."); accuracy below target ("Slow down and aim for accuracy, especially on F and J."); speed below target ("Accuracy is on target. Keep a steady rhythm to build speed on F."); both met with weak keys left ("Both targets met. F still needs practice."); otherwise "Both targets met." The "on ..." parts are dropped when there are no weak keys. Exactly at a target counts as met. No numbers in the sentence.
  - "Continue" (Enter) starts the next lesson of the same track, with newly generated text; after the last lesson of a track it stays on that lesson with new text. "Repeat" (R) restarts the same text.
  - The text keeps its place under the summary, faded out and hidden from assistive technology, so the view does not move. Focus lands on "Continue".

## Lessons view

- Reached from the nav links (Practice, Lessons, Stats) at the top left; the view is the location hash (`#practice`, `#lessons`), so Back works. Practice is the default and shows the current lesson, titled "Lesson 5 · e i" above the text (other tracks: "Numbers 2 · 6 7 8 9 0").
- One section per track: Letters, Punctuation, Numbers, Code. Each lists its lessons as buttons in a grid, with "Unlocked n of m" under the heading. A lesson is a stage of its track and shows the keys it adds; capitals and whole code snippets, which add no key, are named instead. Done lessons say "Done", the current lesson has an accent outline, locked ones are disabled. A button starts its lesson (Enter or click).
- The three non-letter tracks show "Opens at letter lesson 8" until the letter track reaches that step.
- A lesson's track unlocks its next stage when a session of it finishes and every character unlocked in that track meets the accuracy and speed targets over at least 30 attempts (see ARCHITECTURE.md, `core/adaptive`). Capitals are not counted, so finishing a capitals lesson unlocks the next. Progress is the unlocked stage count per track, saved as the `progress` record (the current lesson is not saved). The last lesson of a track shows no "Done", since an unlocked count cannot tell it from the current one. The targets are Settings fields, saved when changed: accuracy 90, 95 or 98 %, speed 20, 25, 30, 35, 40, 50 or 60 wpm; until the Settings view exists they are chosen with two selects at the top of the Lessons view. The text of a run uses the targets from when it began, so changing one does not alter the text on screen.
- Track lessons use the letters unlocked when the lesson started.

## Stats view

- Reached from the `Stats` nav link (`#stats`). Records are read when the view opens. With no sessions it shows only "No sessions yet. Finish a practice session and it will show up here."
- History: two plain SVG line charts, Speed (net wpm) and Accuracy (percent, axis fixed 0 to 100), over the last 30 sessions of the layout, oldest left, one point per session; no x labels. Y axis has ticks at 0, half and a round top (1, 2 or 5 times a power of ten). Each chart has a text alternative (`role="img"` with latest, lowest and highest) and the latest value next to its title. Line is `--accent`, grid `--separator`, width `--chart-line-width`.
- Errors by key: the keyboard in heat mode. A key's heat is its wrong-attempt count over all sessions of the layout, divided by the worst key's count; fill is `--finger-t` mixed toward `--error` by heat times `--heat-max-mix` (75 %). Shift is counted for shifted characters (via `strokesFor`). Colour is not the only signal: a "Most missed" line lists the top five keys with counts. Source is the session records' `errors`. With no errors the board is replaced by "No errors recorded."

- Your data: below the history, always shown, with Export and Import buttons and a status line (errors in `--error`, announced as an alert). Import asks first in a modal `<dialog>` (never `window.confirm`): "Replace your data?", the counts of settings, progress and sessions replaced, and a line for sessions skipped as invalid; buttons Cancel and Replace. After a successful import the current lesson resets to Lesson 1.

## On-screen keyboard

- Drawn from layout data, ISO or ANSI geometry.
- Geometry: five rows from the layout data, one key unit is 1/15 of the keyboard width (at most `--keyboard-max-width`, 44 rem), so it scales with the viewport and never scrolls. Key height and label size are fixed ratios of the unit. In the Space row Space starts 3.75 units from the left, where it sits on a physical ANSI board. The keyboard is below the text, decorative (`aria-hidden`), and each key element carries `data-code` (the `KeyboardEvent.code`) and `data-finger`.
- Labels: letters show the capital only; symbol and digit keys show the shifted character above the base; Shift, Caps, Tab, Enter and Backspace show their names; Space is blank.
- Finger colours: each finger has a `--finger-*` token (L5 … R5, plus T for the thumb) in a light and a dark set; they are the key fill in the finger colours mode.
- Each key shows its label; base and shift characters for symbol keys.
- Modes (setting): **Finger colours** (keys tinted by finger), **Next key only**, **Hidden**. Beginners default to finger colours. Next key only fills every key with the neutral thumb tone and keeps the next-key and Shift outlines; Hidden removes the keyboard from the page. It is a Settings field, saved when changed; until the Settings view exists it is chosen with a select under the keyboard in the Practice view.
- The next key is outlined in accent; for shifted characters, the opposite Shift is outlined as well.
- A pressed key darkens briefly; a wrong press flashes `--error` on the key actually pressed.
- Implementation: the classes `next`, `pressed` and `wrong` are toggled on the static key elements (`key-highlight.ts`). Pressed and wrong are overlays whose opacity fades in 80 ms (`--duration-press`) and stays while the key is held, so no timer runs per keystroke and a quick tap still shows. With reduced motion they switch instantly. The key actually pressed is the `code` of the last keydown. Outline ring, dim and flash strengths are tokens.
- Dead-key characters: the first step outlines the dead key (and the Shift for its shifted form); once that key goes down, the outline moves to the base letter. The Shift outline is the opposite-hand Shift from `strokesFor`.

## Motion

- Durations: 80 ms (key press), 120 ms (caret), 200 ms (view changes). Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Caret blink: 1060 ms cycle, 530 ms on and 530 ms off (`--caret-blink`), resuming after one 530 ms solid phase once typing stops.
- Only `transform` and `opacity` animate.
- With `prefers-reduced-motion` or the Reduce motion setting: no transitions except an instant caret move, and a solid caret.

## Interaction

- The whole app works from the keyboard. Visible focus ring (`--accent`, 2 px, offset 2 px) on every interactive element.
- Shortcuts outside a session: `Enter` start/continue, `R` repeat, `Esc` back / pause, `,` settings. Shown in a help sheet (`?`).
- During a session no shortcut uses a printable key; `Esc` pauses.

## Copy

- A percent sign follows its number after a non-breaking space ("97 %"), so it never wraps onto its own line.
- Plain, short, sentence case: "Continue", "Repeat lesson", "Model server".
- No exclamation marks, no motivational slogans.
- The UI ships in English and Czech; strings live in one file per language (`src/ui/strings/en.ts`, `cs.ts`). The English file is the type, so a missing Czech string fails the type check. The language is Czech when `navigator.language` starts with `cs`, English otherwise; there is no setting until the Settings view exists. Core returns codes (feedback rule, export error, lesson note), never display text.

## Accessibility

- Semantic HTML: views are landmarks, settings use real form controls with labels.
- Session results are announced through an `aria-live="polite"` region; individual keystrokes are not announced.
- The practice text has an accessible description of the current position for screen reader users.
