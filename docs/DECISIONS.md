# Decisions

- Firefox frame-time check: DevTools has no 6× CPU throttle there, so the manual check uses a slow device or OS-level throttling. Reason: keeps the check manual and adds no tooling.
- Ring above (`˚`) compose entry: `Ů` has no dedicated key and the composition table omitted the dead key, so it was unreachable. Reason: all uppercase accented letters are taught as two strokes.
- Other tracks open at letter step 10 for `cs-qwertz`, as LAYOUTS.md already says; the ARCHITECTURE.md sentence now names both layouts. Reason: one per-layout start step keeps `tracksOpen` a lookup.
- Letter order omits `ó ď ň ť`: they have no dedicated key and are two-stroke dead-key letters, so lessons do not teach them and words using them are not generated until all letters are unlocked. Reason: LAYOUTS.md lists exactly 17 steps.
