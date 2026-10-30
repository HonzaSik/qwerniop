# Code style

Biome formats and lints. These are the rules it can't enforce.

## General

- Strict TypeScript. No `any`, no `as` casts except at validated boundaries (parsed JSON, DOM events), no non-null `!` assertions outside tests.
- Prefer plain functions and plain data. Classes only where identity and lifecycle matter (for example the IndexedDB connection).
- One responsibility per file. A file growing past about 200 lines is a signal to split it.
- Name things for what they are in this domain: `layout`, `stroke`, `passage`, `session`, `unlock`. Avoid `utils.ts`, `helpers.ts`, `manager`, `service`.
- No dead code, no commented-out code, no unused exports.
- No premature abstraction: write it twice before extracting.

## Comments

- Explain why, not what. If a comment restates the code, delete it.
- Document non-obvious browser behavior at the place it matters (for example why characters are read from `beforeinput`).
- Public functions in `core/` get a one-line doc comment when the name alone isn't enough.

## Errors

- `core/` functions don't throw for expected conditions; they return results (`{ ok: true, value } | { ok: false, reason }`) where failure is a normal outcome, such as import validation.
- Unexpected states throw with a clear message.
- The UI never shows raw error messages; it shows a short sentence and logs details to the console in development.

## Svelte

- Svelte 5 runes only: `$state`, `$derived`, `$effect`, `$props`. No legacy `export let`, no `$:`.
- `$effect` is a last resort. Prefer `$derived` and event handlers.
- Components are small and mostly presentational. Logic goes to `core/` or a `.svelte.ts` module.
- Props are typed with an interface in the component's `<script lang="ts">`.
- Styles are scoped in the component and use tokens only. Global styles live in `src/ui/styles/`.
- Keyboard handling for the practice text goes through `src/input/`, not ad hoc `on:keydown` in components.

## Tests

- Vitest. Tests sit next to the code: `engine.ts` and `engine.test.ts`.
- Test behavior, not implementation. Describe sequences of keystrokes and assert resulting state.
- Randomness is seeded; time is injected. No real timers in tests.
- Every bug fix in `core/` starts with a failing test.

## Dependencies

- Runtime: `svelte` only.
- Dev: Vite, `@sveltejs/vite-plugin-svelte`, TypeScript, `svelte-check`, Biome, Vitest. Anything else needs an issue first.
- Pin exact versions; update deliberately.

## Git

- Small, focused commits. Imperative subject under 72 characters.
- `main` is always green: `pnpm check && pnpm test && pnpm build` pass on every commit.
