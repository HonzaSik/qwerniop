# Manual checks

Checks that need a human at a real browser. Record the date and result in the commit or PR that closes the milestone.

## Frame time at 6× CPU throttling (Chromium and Firefox)

Budget (PERFORMANCE.md): keystroke to painted frame under 16 ms at 6× CPU slowdown.

Chromium:

1. `pnpm build && pnpm preview`, open the app in a fresh profile with extensions off.
2. DevTools, Performance panel, CPU: 6× slowdown.
3. Start a session. Record 20 s of fast, continuous typing (include a line wrap and a few errors).
4. In the Frames and Main tracks, inspect every long frame and long task.

Firefox:

1. Same build. DevTools, Performance, record 20 s of the same typing. Firefox has no CPU throttle in DevTools, so throttle the machine instead, or use a device at least 6× slower than a desktop, and note which.
2. Inspect the frames track for frames over 16 ms.

Pass:

- No frame over 16 ms caused by app code (scripting, style, layout, paint triggered by keystrokes).
- No layout shift in the recording.
- No layout read (`getBoundingClientRect`, `offsetLeft`) inside the keystroke handler.

On failure, fix the cause on the keystroke path and repeat the check.

## Layout switcher and per-layout progress

1. `pnpm dev`, open the app, finish a letter lesson with `en-us` and note the Lessons view unlock count.
2. Choose "Czech (QWERTZ)" in the Layout select at the top right. The keyboard, lesson title and words become Czech and Lessons shows Czech progress from Lesson 1.
3. Reload the page. Czech is still selected.
4. Switch back to the English layout. Its earlier unlock count is unchanged.
5. In Stats, history and heatmap show only the layout in use. Export, import the file and check both layouts keep their progress.
