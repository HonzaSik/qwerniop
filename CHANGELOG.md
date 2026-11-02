# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Appearance settings: theme (with Black for OLED), accent colour, text size and caret style. Error mode and live stats moved to Settings, with more session lengths.
- Each new key is introduced with its finger and reach before a lesson, followed by a short drill.
- Practice calendar in Stats, one month at a time, with minutes practised today.
- Learn a topic from Lessons, using the optional model server.
- Custom text: paste anything and type it. It counts in Stats and unlocks nothing.
- Daily challenge: the same words for everyone each day. Your first finished try is your score, and Copy result lets you compare with friends. There is no server and no ranking, so a shared score is the sender's word.
- A session pauses itself after 10 s with no key, and the wait counts neither as time nor against speed.
- The summary shows your speed against your last 10 sessions, and "Drill these" drills the weakest keys it names.
- The app asks the browser to keep your data, so it is not evicted when disk runs low. Firefox may show a prompt for this.
- Weakest keys: a drill where each key appears in proportion to how often you miss it.
- Letter combinations and moves between keys in Stats. These measure only and do not change what is practised.
- A practice pet that grows with practice, is named once, greets you before a session and keeps memories. It also says how many days in a row you have practised.
- Next up in Lessons, saying what the next unlock still needs.
- Developer mode, which makes any lesson startable without unlocking anything.
- Delete all data in Settings, with a confirmation.
- Start over while paused. Enter starts Next up on Lessons.

### Changed

- Lessons and Stats are wider, with columns from 900 px and sections on tabs. Stats opens with headline figures and their change against earlier sessions.
- Errors by key are the share of tries that went wrong, not a count.
- A letter lesson uses only its own letters, so going back to Lesson 1 practises just f and j.
- Coming back to a finished session moves on to new text.

### Fixed

- Import failed every time, in 1.0.0 too.
- Esc did not pause a session, and keys on a link or control were taken by a paused session.
- Esc in an open dialog also left the view behind it.
- A tab left open could undo newer data with its next save. A tab now reloads when it regains focus after another tab saved, so a passage half typed there is lost.
- Practice under a minute read as no practice.

### Known limitations

- These changes are checked in Chromium only. Firefox, Safari, screen readers and real phones are not checked.

## [1.0.0] - 2026-10-31

First public release. See the known limitations below.

### What you get

Typing trainer
- Practice view with a text passage, caret and an on-screen keyboard.
- Two error modes: stop on error, or continue and fix with Backspace.
- Session length by word count (15, 30, 60) or timer (30, 60, 120 seconds).
- Live stats while typing, which you can hide, and a summary after each session: net and gross WPM, accuracy and duration.

Layouts
- US QWERTY (`en-us`, ANSI) and Czech QWERTZ (`cs-qwertz`, ISO), with dead keys (háček, čárka) composed the way the layout does it.
- The keyboard shows the finger for each key, only the next key, or nothing. The opposite Shift key is highlighted when needed.
- Progress is kept separately for each layout.
- Settings holds Layout, Length, Reduce motion and Language (System, English, Čeština).

Lessons and adaptive practice
- Lessons start on the home row and add letters in pairs; the Czech order ends with step 18, which teaches ó ď ň ť. The current lesson is remembered for each layout. The next letters unlock when every unlocked character meets your targets: 95 % accuracy and 35 WPM equivalent by default, both configurable, over at least 30 attempts.
- Practice words are weighted toward your weakest characters. Early lessons use pseudo-words until there are enough real ones.
- Content types: words, punctuation and capitals, numbers, and code (built-in snippets).
- A short feedback sentence after each session names your weakest keys.

Stats and data
- History chart of WPM and accuracy, and a per-key heatmap on the keyboard.
- Everything is stored in your browser. JSON export and import with validation and a confirmation step.

Offline and install
- Works offline after the first load and can be installed as an app (service worker and manifest).
- Bundled monospace font subset; no external requests.

Accessibility and language
- Full keyboard navigation, visible focus states and a shortcut help sheet.
- Reduce motion setting that follows the system preference by default.
- Screen reader labels and announcements, in English and Czech.
- Czech interface, with light and dark appearance following the system.
- Interface language can be set to System, English or Čeština in Settings, and applies without a reload.
- A message on touch-first devices, which are not a supported typing target.

Optional model server
- Off by default. The app works the same with no model server configured, and the model code is not loaded until you enable it.
- Connects to any OpenAI-compatible server (Ollama, LM Studio, llama.cpp), by default `http://localhost:11434/v1`.
- Four modes: lesson text, learn a topic, code snippets and session feedback. Lesson text follows the session length and is topped up with offline words when the model returns too few. Feedback uses your weakest fingers and recent trend. Output is validated, prepared in the background so typing never waits, and falls back to offline text without errors.
- Only prompts and session statistics are sent, never what you typed.

Privacy
- All settings, progress and history stay on your device. Nothing is sent anywhere unless you enter a model server address.

### Known limitations

- Headless Chromium checks passed (see [docs/MANUAL_CHECKS.md](docs/MANUAL_CHECKS.md)). Screen reader checks (Orca, VoiceOver), Firefox, real touch devices and the install and update flow remain manual.
- The English and Czech word lists come from the Leipzig Corpora Collection under CC BY, and the font is JetBrains Mono under the SIL Open Font License. Details and attribution are in [src/data/SOURCES.md](src/data/SOURCES.md).
- Only two layouts ship, and code practice is JavaScript only.
- The model server must allow the app's origin (CORS); Settings shows how.
