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
2. Choose "Czech (QWERTZ)" in the Layout select in Settings. The keyboard, lesson title and words become Czech and Lessons shows Czech progress with Lesson 1 current.
   Start a later unlocked Czech lesson, then switch to English and back: the later lesson is current again.
3. Reload the page. Czech is still selected and its last lesson is current.
4. Switch back to the English layout. Its earlier unlock count is unchanged.
5. In Stats, history and heatmap show only the layout in use. Export, import the file and check both layouts keep their progress.

## Czech UI

1. In Chrome set the browser language to Czech (Settings, Languages) and reload `pnpm dev`; or run `navigator.language` in the console to confirm it starts with `cs`. The page language (`<html lang>`) is `cs`.
2. Walk Practice, Lessons and Stats. Every label, button, select option, status message and the session summary is Czech with correct diacritics, and no English is left (the layout select in Settings reads "Čeština (QWERTZ)").
3. Finish a session. The feedback sentence reads naturally, including with one, two and three weak keys.
4. In Stats, export, then import a file: the replace dialog and its counts read correctly; import a non-export JSON and check the error is Czech.
5. Check that text fits: nav, the Settings rows, Lessons buttons and the summary do not wrap badly or overflow at 1280 px and at 360 px.
6. Switch the browser back to English and reload: the whole UI is English again.
7. In Settings choose Language "Čeština" with the browser in English: every string switches at once with no reload and `<html lang>` is `cs`. Choose "English": back to English, `lang` is `en`. Choose "System": it follows the browser. Reload: the choice is kept. Export, import: the choice comes back.

## Design pass

Check each screen in light and dark (system setting, then `data-theme` set to `light` and `dark` on `<html>` in DevTools), at 1280 px and 360 px.

1. Practice: typed text reads as primary, untyped as clearly dimmer; caret and next key are accent; a wrong character is red and underlined on a tinted background. Spacing around the nav, timer and keyboard is even.
2. Keyboard: all eight finger colours are distinct and muted in both appearances, labels are legible on every key, next-key outline and Shift outline are visible.
3. Summary: numbers are tabular, accuracy shows "97 %" with no wrap between number and sign, Continue has a visible focus ring.
4. Lessons: locked buttons are readable but clearly disabled, the current lesson has an accent outline, "Unlocked n of m" is secondary text.
5. Stats: chart ticks match the size of other small text, line is accent, grid is hairline; the heatmap tints toward red without losing key labels; the Your data status error is red.
6. Nothing uses a colour, size or gap that looks off the scale (4, 8, 12, 16, 24, 32 px), and no gradients, shadows or glows appear.

## Reduce motion

1. With the setting on System and the OS "reduce motion" preference off: the caret glides and blinks, the text scrolls smoothly, keys fade, the summary fades in.
2. Turn the OS preference on (no reload): the caret is solid and jumps instantly, the text scrolls by whole lines with no animation, key highlights and the summary switch instantly.
3. In Settings, Accessibility, set the select to Off with the OS preference on: motion returns. Set it to On with the OS preference off: motion stops. Reload: the choice is kept.

## Keyboard navigation and help sheet

1. On Practice, Lessons and Stats, press Tab from the page start through every control to the end and back with Shift+Tab: the order follows the visual order and nothing is skipped or trapped. Use Enter or Space on each button and link, and arrow keys on each select.
2. Every focused element shows a 2 px accent ring with a 2 px gap, in light and in dark (set `data-theme` on `<html>`).
3. Outside a session press `?`: the help sheet opens, focus moves into it, and Tab stays inside. Esc closes it and focus returns to where it was. Repeat with the Close button.
4. In a session type `?` and Esc: `?` is typed as a character and Esc pauses. Press any key to resume.
5. On Lessons and Stats press Esc: Practice opens. On the summary Enter continues and R repeats.
6. With a screen reader, opening the sheet announces its title "Keyboard shortcuts" (or the Czech title) and the shortcut list is readable as pairs.

## Screen reader (Orca on Linux, VoiceOver on macOS)

Setup: `pnpm build && pnpm preview`. Orca: Firefox or Chromium, start with `orca` (Super+Alt+S on GNOME). VoiceOver: Safari, Cmd+F5. Repeat once with the browser language set to Czech: speech should switch to a Czech voice and all labels be Czech.

1. Landmarks: jump by landmark (Orca: `m`; VoiceOver: rotor, Landmarks). Announced: navigation named "Views" (or Czech), main named "Practice". Headings (Orca: `h`; rotor) list the lesson title as level 1. Lessons and Stats list their section headings and name their main landmark.
2. Controls: Tab through Practice. Each select is announced with its label (Keyboard on Practice; Language, Layout, Length, Reduce motion in Settings) and current value. The current nav link is announced as current page.
3. Practice text: Tab to the text field. Announced: "Type the text" and the passage as its description. The on-screen keyboard and caret are never announced or reachable in browse mode.
4. Typing: type 20 characters, including errors. Nothing is announced per keystroke (no character echo from the app, no "correct" or "wrong"). Orca's own key echo may speak typed characters; turn it off in Orca preferences for this check.
5. Pause: press Esc or click away. "Click or press any key to continue" is announced once. Resuming does not repeat it.
6. Timed session: choose a seconds length and start. The countdown is not announced every second (browse to it to read it: "Time left").
7. Summary: finish a session. "Session results" with WPM, accuracy, time and the feedback is announced once, politely, after the final key. Focus lands on Continue, announced with its shortcut. Repeat and Continue are reachable.
8. Dialogs: press `?` outside a session. The dialog and title "Keyboard shortcuts" are announced, shortcuts read as pairs; Esc closes and focus returns. On Stats, Your data: Import of a file opens the replace dialog with its title announced, and error or success messages are announced.
9. Stats chart: the line chart is one image with a text summary; the heatmap keys are readable.

Pass: every item announces what is listed and nothing else. Record any extra announcement and its trigger.

## Touch-device message

Setup: `pnpm build && pnpm preview`.

1. Phone: open Practice. "Connect a keyboard to practice" shows above the passage. Tapping to raise the on-screen keyboard and typing does not hide it if the keyboard sends no key code.
2. Tablet with a hardware keyboard: the message shows on load and disappears on the first hardware key press; typing works normally.
3. Desktop with DevTools touch emulation (Chromium device mode, reload after enabling): the message shows; press any key and it disappears.
4. Desktop with mouse and no emulation: the message never shows.

Pass: the message appears only on touch-first devices and never returns after a physical key.

## Offline and install

Setup: `pnpm build && pnpm preview`, Chromium with a fresh profile.

1. Open the preview URL and let it load. DevTools, Application, Service Workers: `sw.js` is activated.
2. Network panel: tick Offline and reload. The app loads and a session works.
3. Back online, switch Layout to Czech (QWERTZ) once so its word list loads. Go offline, reload, switch between layouts. Both work.
4. Update flow: change any source file, run `pnpm build` again (preview serves the new `dist`), reload the open tab. "Update available" shows. Click Reload: the page reloads and Application shows the new worker as activated.
5. Application, Manifest: no errors, name "Tenfold", icon shown, installable (install icon in the address bar).
6. With a model server configured, requests to it are not listed under Cache Storage.

Pass: offline reload works for both layouts, the update message appears only after a rebuild, and the manifest has no warnings.

## Practice font

Setup: `pnpm build && pnpm preview`, Chromium with a fresh profile, DevTools open.

1. Network panel, reload with cache disabled: `JetBrainsMono-Regular-subset.woff2` loads, is under 60 KB, and its Initiator is "Other" (the preload link in `index.html`), with no second request for it.
2. Practice with layout Czech (QWERTZ): a passage with `ě š č ř ž ý á í é ú ů ď ť ň` renders in JetBrains Mono. DevTools, Elements, Computed, Rendered Fonts on `#passage` lists only "JetBrains Mono" and no fallback.
3. Switch to English: punctuation (`{ } [ ] < > | ~ ^ \ @ # $ %`) renders from the same font.
4. Network panel, throttle to Slow 3G, reload: text is readable straight away in the monospace fallback and swaps once the font arrives.

Pass: one font request, no fallback glyphs, and the text stays monospace before and after the swap.

## Performance pass

Setup: `pnpm build && pnpm preview`.

1. Build budgets: `pnpm build` ends with `size-check: all budgets hold` (initial JS 50 KB, CSS 10 KB, font 60 KB, each word list 60 KB, all gzip except the font). Recorded 2026-10-31: JS 36.7 KB, CSS 3.2 KB, font 9.3 KB, word lists 36.5 KB (en) and 38.9 KB (cs).
2. Lazy loading: Network panel, reload with cache disabled, the word list `.txt` for the current layout is requested after the page scripts, and the other locale's list is not requested.
3. Time to interactive: Chromium, Lighthouse (Navigation, Mobile), throttling Slow 4G and 4× CPU, incognito with no extensions. Run three times; the median TTI must be under 2 s.
4. Frame time: run the "Frame time at 6× CPU throttling" check above in Chromium and in Firefox.
5. `pnpm test:bench`: each case under 0.05 ms per event and within 20 % of `tests/bench/BASELINE.md`.

Pass: every number is inside its budget in `docs/PERFORMANCE.md`. Record the measured TTI and the long-frame count here when run.

## Model provider

Setup: a local OpenAI-compatible server (for example Ollama on `http://localhost:11434/v1`) with CORS allowing the dev origin.

1. In the browser console on the dev page: `const { createOpenAiProvider } = await import("/src/ai/openai-compatible.ts"); const p = createOpenAiProvider({ baseUrl: "http://localhost:11434/v1", model: "<a model>" }); await p.listModels()` returns model names.
2. `for await (const t of p.stream({ system: "Reply briefly.", prompt: "Say hello.", maxTokens: 30, temperature: 0.7 })) console.log(t)` logs pieces as they arrive.
3. Stop the server and repeat: both calls reject with `ProviderError` of kind `network`.

Pass: text streams in pieces, and a stopped server gives a rejection, not a hang.

## Settings: model server

Setup: a local OpenAI-compatible server (for example Ollama), and `pnpm dev` or `pnpm preview`.

1. DevTools Network with cache disabled, reload, open `#settings` (or press `,`): no `ai` chunk is requested yet.
2. Click "Test connection" with CORS allowed (`OLLAMA_ORIGINS` includes the page origin): the `ai` chunk loads, the status reads "Connected. n models found." and the Model select lists them.
3. Restart the server without the origin allowed and test again: the status reads "The server could not be reached." and the CORS help appears with the real origin.
4. Use a wrong API key on a server that answers: an error without the CORS help. Reload: address, model and key are kept. Export the data: the file has no `modelServer`.
5. Every field is reachable and operable by keyboard.

Pass: the chunk loads only on the first test, and failures show plain words.

## Model modes

Setup: Ollama with a model pulled (for example `qwen2.5-coder:14b`), `OLLAMA_ORIGINS` including the page origin, `pnpm dev`. In Settings run "Test connection" and pick the model, then switch on "Use the model server".

1. Lesson text: progress to at least 12 letters (lesson 7 on English), start a letters lesson. After a short wait the text is sentences using only the unlocked letters. With "Lesson text" off, it is the offline word text.
2. Learn a topic: enter a topic in Settings, reach the last letter lesson (or import progress), start a letters lesson: the text is a short teaching passage on the topic, typable on the layout. The next lesson continues the topic.
3. Code snippets: start code lesson 4 (whole snippets): the text is a short JavaScript snippet with indentation; Enter types a newline.
4. Session feedback: finish any session: the offline sentence appears at once and is replaced by two or three model sentences within seconds.
5. Learn a topic recap and history: finish three topic passages in a row. After the third, a line "Think about it:" with a question appears under the feedback sentence; it is not typed and does not appear after passages one and two. Reload the page and start another letters lesson: the passage continues the topic (DevTools, Application, IndexedDB `tenfold`, `topics` holds the topic with at most 6 passages).
6. Stop the server and repeat 1 to 5: no error is shown, each lesson starts with offline text after at most 8 s, and the summary keeps the offline sentence.
7. With "Use the model server" off, reload with cache disabled and open Practice: no `ai` chunk (`modes`, `openai-compatible`) is requested.

Pass: every mode (and the recap) shows model text when the server runs, the offline text and sentence when it does not, and nothing blocks typing.


## Model prefetching

Setup: as for Model modes, with a lesson that uses a model mode (for example lesson text from lesson 7).

1. Slow server (add a delay, or load a large model cold): finish a session and click Next at once. The next session starts immediately with offline text and no wait. Wait a few seconds, finish it and click Next: the text is from the model.
2. Change the lesson, switch layout or unlock a letter while a request is running: DevTools Network shows the old request cancelled and a new one for the new lesson.
3. Stop the server and keep practising: no error, no delay at any session start, offline text throughout.
4. While a stream is running, type steadily: input stays smooth and the passage does not flicker or re-render.

Pass: no session start ever waits for the model, stale requests are cancelled, and typing stays smooth.

## Model chunk not loaded when disabled

Setup: model server disabled in Settings (the default); DevTools Network open with "Disable cache" on, filter on `ai-`.

1. Reload and finish a full session, then Next, then the summary. No `ai-*.js` request appears.
2. Open Settings and leave again. Still no `ai-*` request.
3. Enable the server, enter an address and press the connection test: `ai-openai-compatible-*.js` loads now.

Pass: the `ai-*` chunks load only after the server is enabled and used.

## README screenshots

Re-capture before a release if the UI changed. `--virtual-time-budget` leaves the page blank (IndexedDB never resolves), so use `--timeout`.

```sh
pnpm build && pnpm preview --port 4173 &
for m in light dark; do
  chromium --headless=new --no-sandbox --hide-scrollbars --window-size=1280,800 \
    --timeout=4000 --run-all-compositor-stages-before-draw \
    --blink-settings=preferredColorScheme=$([ $m = dark ] && echo 0 || echo 1) \
    --screenshot=docs/screenshots/practice-$m.png http://localhost:4173/
done
```

Open both PNGs: the page must be rendered (not blank) and the two must differ. Stop the preview server afterwards.

## GitHub Pages

After the first push to GitHub, open repository Settings, Pages, and set Source to "GitHub Actions"; then run the Pages workflow (or push again). Load `https://<user>.github.io/tenfold/` and check: the page renders with the monospace font, a lesson types, and both word lists load (switch layout to Czech). In DevTools, Application shows the worker active with scope `/tenfold/`. Go offline and reload: the app still loads. Install it from the browser menu and confirm it opens at `/tenfold/`.

## Release

Open https://wortschatz.uni-leipzig.de/en/usage in a browser (it sits behind a bot check) and confirm the corpora are still offered under CC BY, then update the quote in `src/data/SOURCES.md` if it differs.

After the checks above pass and the license review is done: in `CHANGELOG.md` rename `[Unreleased]` to `[1.0.0] - <date>`, set `"version": "1.0.0"` in `package.json`, commit, tag `v1.0.0` and push the commit and the tag.
