# Contributing

Thanks for helping. Tenfold stays small on purpose, so please read this before opening a pull request.

## Before you start

- For anything larger than a bug fix, open an issue first so we can agree on the approach.
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/CODE_STYLE.md](docs/CODE_STYLE.md).
- New runtime dependencies need a strong reason. Discuss them in the issue.

## Setup

```sh
pnpm install
pnpm dev
```

## Checks

Every pull request must pass:

```sh
pnpm check      # Biome lint and format, TypeScript, svelte-check
pnpm test       # unit tests
pnpm build      # includes the bundle size budget
```

## Pull requests

- One topic per pull request.
- Changes to `src/core/` include tests.
- UI changes include a screenshot in light and dark appearance.
- Keep the performance rules in [docs/PERFORMANCE.md](docs/PERFORMANCE.md). Changes to the typing loop need a note on how you checked frame time.

## Commit messages

Imperative mood, short subject line, body explaining why when it isn't obvious:

```
Add dead-key handling for Czech layout

keydown reports "Dead" for háček and čárka, so characters are now
read from beforeinput instead.
```

## Adding a layout

Layouts are data. See [docs/LAYOUTS.md](docs/LAYOUTS.md) for the format and how to verify it against the system layout definition.

## Adding word lists

Word lists must have a license compatible with MIT. Record the source and license in `src/data/SOURCES.md` in the same pull request.
