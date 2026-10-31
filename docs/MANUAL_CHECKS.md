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

## Czech UI

1. In Chrome set the browser language to Czech (Settings, Languages) and reload `pnpm dev`; or run `navigator.language` in the console to confirm it starts with `cs`. The page language (`<html lang>`) is `cs`.
2. Walk Practice, Lessons and Stats. Every label, button, select option, status message and the session summary is Czech with correct diacritics, and no English is left (the layout select reads "Čeština (QWERTZ)").
3. Finish a session. The feedback sentence reads naturally, including with one, two and three weak keys.
4. In Stats, export, then import a file: the replace dialog and its counts read correctly; import a non-export JSON and check the error is Czech.
5. Check that text fits: nav, the two selects at the top right, Lessons buttons and the summary do not wrap badly or overflow at 1280 px and at 360 px.
6. Switch the browser back to English and reload: the whole UI is English again.

## Design pass

Check each screen in light and dark (system setting, then `data-theme` set to `light` and `dark` on `<html>` in DevTools), at 1280 px and 360 px.

1. Practice: typed text reads as primary, untyped as clearly dimmer; caret and next key are accent; a wrong character is red and underlined on a tinted background. Spacing around the nav, selects, timer and keyboard is even.
2. Keyboard: all eight finger colours are distinct and muted in both appearances, labels are legible on every key, next-key outline and Shift outline are visible.
3. Summary: numbers are tabular, accuracy shows "97 %" with no wrap between number and sign, Continue has a visible focus ring.
4. Lessons: locked buttons are readable but clearly disabled, the current lesson has an accent outline, "Unlocked n of m" is secondary text.
5. Stats: chart ticks match the size of other small text, line is accent, grid is hairline; the heatmap tints toward red without losing key labels; the Your data status error is red.
6. Nothing uses a colour, size or gap that looks off the scale (4, 8, 12, 16, 24, 32 px), and no gradients, shadows or glows appear.

## Reduce motion

1. With the setting on System and the OS "reduce motion" preference off: the caret glides and blinks, the text scrolls smoothly, keys fade, the summary fades in.
2. Turn the OS preference on (no reload): the caret is solid and jumps instantly, the text scrolls by whole lines with no animation, key highlights and the summary switch instantly.
3. Set the select to Off with the OS preference on: motion returns. Set it to On with the OS preference off: motion stops. Reload: the choice is kept.

## Keyboard navigation and help sheet

1. On Practice, Lessons and Stats, press Tab from the page start through every control to the end and back with Shift+Tab: the order follows the visual order and nothing is skipped or trapped. Use Enter or Space on each button and link, and arrow keys on each select.
2. Every focused element shows a 2 px accent ring with a 2 px gap, in light and in dark (set `data-theme` on `<html>`).
3. Outside a session press `?`: the help sheet opens, focus moves into it, and Tab stays inside. Esc closes it and focus returns to where it was. Repeat with the Close button.
4. In a session type `?` and Esc: `?` is typed as a character and Esc pauses. Press any key to resume.
5. On Lessons and Stats press Esc: Practice opens. On the summary Enter continues and R repeats.
6. With a screen reader, opening the sheet announces its title "Keyboard shortcuts" (or the Czech title) and the shortcut list is readable as pairs.
