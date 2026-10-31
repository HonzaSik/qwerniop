# Decisions

- Firefox frame-time check: DevTools has no 6× CPU throttle there, so the manual check uses a slow device or OS-level throttling. Reason: keeps the check manual and adds no tooling.
- Ring above (`˚`) compose entry: `Ů` has no dedicated key and the composition table omitted the dead key, so it was unreachable. Reason: all uppercase accented letters are taught as two strokes.
- Other tracks open at letter step 10 for `cs-qwertz`, as LAYOUTS.md already says; the ARCHITECTURE.md sentence now names both layouts. Reason: one per-layout start step keeps `tracksOpen` a lookup.
- Letter order omits `ó ď ň ť`: they have no dedicated key and are two-stroke dead-key letters, so lessons do not teach them and words using them are not generated until all letters are unlocked. Reason: LAYOUTS.md lists exactly 17 steps.
- Layout switcher sits beside the Length select until the Settings view exists, and the word list loads after storage at startup. Reason: the saved layout decides which list to fetch, and a second control reuses the existing pattern.
- Switching layout resets the current lesson to Lesson 1 instead of keeping a per-layout current lesson. Reason: the current lesson is not saved, so one rule fits switch, import and startup.
- A missing or unknown `layout` setting reads as `en-us` without a settings version bump. Reason: `migrateSettings` already repairs each field alone.
- UI language follows `navigator.language` (`cs*` is Czech, else English) with no setting yet. Reason: DESIGN.md names no selector, and a setting would change the settings schema and export for no gain before the Settings view.
- `src/core` returns codes instead of English sentences: `feedbackRule`, export `reason`, `noNewKeys`; `lessonTitle` moved to `src/ui/strings`. Reason: core must stay free of display text so each language file holds all of its strings.
- Czech plural forms (1 / 2 to 4 / 5+) use one three-argument `plural` helper, and only where a form differs; other counts are phrased so the noun does not agree. Reason: no i18n package is allowed.
- Design pass: `--space-1` was used but undefined, so the full `--space-1` to `--space-8` set is now in tokens.css; chart tick size and the heading weight use tokens. Reason: DESIGN.md requires every value from tokens.
- Accuracy uses a non-breaking space before `%` in both languages. Reason: Czech typography requires it and one format keeps `formatAccuracy` simple.
- Reduce motion is a `system` / `on` / `off` select beside Length until the Settings view exists, and App sets `data-reduce-motion` on `<html>`; all motion CSS is scoped to `:root:not([data-reduce-motion])` instead of media queries. Reason: one mechanism lets the setting override the OS in both directions with no per-component logic.
- `reduceMotion` is missing or unknown reads as `system` without a settings version bump. Reason: `migrateSettings` already repairs each field alone.
