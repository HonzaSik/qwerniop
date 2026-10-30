# Engine benchmark baseline

These numbers are specific to this machine. Compare them only with runs on the same machine; on other hardware, only the budget applies.

## Run

| | |
|---|---|
| Date | 2026-10-30 |
| Command | `pnpm test:bench`, run 5 times |
| Commit | `8068990` (engine code measured; the benchmark landed in the commit after it) |
| Node | v26.12.1 |
| Vitest | 5.0.5 |
| Machine | AMD Ryzen 9 9900X, 24 threads, Linux 7.2.11, `powersave` governor, load average about 4.8 during the runs |

## Results

Budget: `apply` < 0.05 ms per event (`docs/PERFORMANCE.md`). Every case is within it by more than 2000 times.

| Case | Events per iteration | Per-event time (median of 5 runs) | Range over 5 runs | Budget |
|---|---|---|---|---|
| Clean correct run | 884 | 0.0000207 ms | 0.0000204 to 0.0000221 ms | 0.05 ms |
| Errors, stop mode | 928 | 0.0000212 ms | 0.0000206 to 0.0000230 ms | 0.05 ms |
| Errors and Backspace, continue mode | 972 | 0.0000206 ms | 0.0000201 to 0.0000225 ms | 0.05 ms |
| Code with newlines and indentation | 769 | 0.0000216 ms | 0.0000214 to 0.0000238 ms | 0.05 ms |

## How to read the numbers

- One benchmark iteration applies every event of a whole passage, so Vitest's `hz` and `mean` describe a passage, not an event.
- Per-event time = `mean` column / events in the benchmark name. The benchmark prints this figure as `ms/event`.
- `1000 / (hz * events)` gives nearly the same figure, 1 to 2 % lower, because `hz` averages the rate of each sample.
- Events are `apply` calls, including wrong keys and Backspace. They are not passage characters: skipped indentation produces no event.
- `createSession` runs in `beforeEach`, outside the timed function, so it is not in these numbers.
- The figure is a mean. It does not bound a single event; a garbage collection pause during one iteration is spread over that iteration's events.

## Checking for a regression

Run `pnpm test:bench` on this machine and compare each case's `ms/event` by hand with the median above. More than 20 % slower is a regression (`docs/PERFORMANCE.md`). Identical runs differ by about 12 % in the range above, and a sixth run straight after `pnpm build` reached 0.0000254 ms in stop mode, 20 % over the median. A single run near the limit therefore proves nothing: repeat it on an idle machine and compare medians. The benchmark itself fails only on the 0.05 ms budget.
