# Decisions

- Firefox frame-time check: DevTools has no 6× CPU throttle there, so the manual check uses a slow device or OS-level throttling. Reason: keeps the check manual and adds no tooling.
- Ring above (`˚`) compose entry: `Ů` has no dedicated key and the composition table omitted the dead key, so it was unreachable. Reason: all uppercase accented letters are taught as two strokes.
