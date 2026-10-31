# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
