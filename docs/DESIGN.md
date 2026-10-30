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
- **Weights:** 400 and 600 only.
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
- Three lines of text are visible; the view scrolls by whole lines, without animation if reduce motion is on.
- End of session: text fades out and a summary appears in place: WPM, accuracy, time, weakest keys, a sentence of feedback, and "Continue" (Enter) / "Repeat" (R).

## On-screen keyboard

- Drawn from layout data, ISO or ANSI geometry.
- Each key shows its label; base and shift characters for symbol keys.
- Modes (setting): **Finger colours** (keys tinted by finger), **Next key only**, **Hidden**. Beginners default to finger colours.
- The next key is outlined in accent; for shifted characters, the opposite Shift is outlined as well.
- A pressed key darkens briefly; a wrong press flashes `--error` on the key actually pressed.

## Motion

- Durations: 80 ms (key press), 120 ms (caret), 200 ms (view changes). Easing: `cubic-bezier(0.2, 0, 0, 1)`.
- Only `transform` and `opacity` animate.
- With `prefers-reduced-motion` or the Reduce motion setting: no transitions except an instant caret move.

## Interaction

- The whole app works from the keyboard. Visible focus ring (`--accent`, 2 px, offset 2 px) on every interactive element.
- Shortcuts outside a session: `Enter` start/continue, `R` repeat, `Esc` back / pause, `,` settings. Shown in a help sheet (`?`).
- During a session no shortcut uses a printable key; `Esc` pauses.

## Copy

- Plain, short, sentence case: "Continue", "Repeat lesson", "Model server".
- No exclamation marks, no motivational slogans.
- The UI ships in English and Czech; strings live in one file per language.

## Accessibility

- Semantic HTML: views are landmarks, settings use real form controls with labels.
- Session results are announced through an `aria-live="polite"` region; individual keystrokes are not announced.
- The practice text has an accessible description of the current position for screen reader users.
