# Layouts, fingers and lessons

## Source of truth

Layout data must match what the operating system actually produces. On Linux, the reference is the XKB symbols files:

- US: `/usr/share/X11/xkb/symbols/us`, section `basic`
- Czech: `/usr/share/X11/xkb/symbols/cz`, section `basic` (QWERTZ)

When creating or changing a layout file, compare every key against these and note any differences from the Windows and macOS layouts of the same name in the layout file's header comment. **The tables below are a starting point and must be verified key by key**, especially the Czech number row, the key left of `1`, and the dead keys.

`tests/xkb-<id>.test.mjs` compares the layout with the XKB file and is skipped when the file is absent.

Layouts live in `src/core/layouts/<id>.ts` as `Layout` objects (see ARCHITECTURE.md).

## Physical rows

Use ISO geometry for `cs-qwertz` (extra key `IntlBackslash` left of `Z`/`Y`) and ANSI for `en-us`. The on-screen keyboard draws from this data, so the geometry is part of the layout. Only keys in the finger map are listed; row 4 is Space only.

## Finger map

Same physical assignment for both layouts:

| Finger | Keys (by position, US labels) |
|---|---|
| L5 left pinky | `` ` `` `1` `Q` `A` `Z`, Tab, Caps, left Shift, `IntlBackslash` |
| L4 left ring | `2` `W` `S` `X` |
| L3 left middle | `3` `E` `D` `C` |
| L2 left index | `4` `5` `6` `R` `T` `F` `G` `V` `B` |
| R2 right index | `7` `Y` `U` `H` `J` `N` `M` |
| R3 right middle | `8` `I` `K` `,` |
| R4 right ring | `9` `O` `L` `.` |
| R5 right pinky | `0` `-` `=` `P` `[` `]` `\` `;` `'` `/`, Enter, Backspace, right Shift |
| T thumbs | Space |

`6` is assigned to the left index finger, which most ten-finger courses teach; some assign it to the right. Keep it as a single constant so it is easy to change.

**Shift rule:** capitals and shifted symbols use the Shift key on the *opposite* hand from the key being pressed. The on-screen keyboard highlights both keys.

## `en-us` (ANSI)

| Row | Keys (base / shift) |
|---|---|
| 0 | `` ` ~ `` `1 !` `2 @` `3 #` `4 $` `5 %` `6 ^` `7 &` `8 *` `9 (` `0 )` `- _` `= +` |
| 1 | `q` `w` `e` `r` `t` `y` `u` `i` `o` `p` `[ {` `] }` `\ \|` |
| 2 | `a` `s` `d` `f` `g` `h` `j` `k` `l` `; :` `' "` |
| 3 | `z` `x` `c` `v` `b` `n` `m` `, <` `. >` `/ ?` |

No dead keys.

## `cs-qwertz` (ISO)

| Row | Keys (base / shift) |
|---|---|
| 0 | `; °`¹ `+ 1` `ě 2` `š 3` `č 4` `ř 5` `ž 6` `ý 7` `á 8` `í 9` `é 0` `= %` `´ ˇ`² |
| 1 | `q` `w` `e` `r` `t` `z` `u` `i` `o` `p` `ú /` `) (` `¨ '`² |
| 2 | `a` `s` `d` `f` `g` `h` `j` `k` `l` `ů "` `§ !` |
| 3 | `\ \|`³ `y` `x` `c` `v` `b` `n` `m` `, ?` `. :` `- _` |

1. Verify: on some systems Shift here is a dead ring above (`°` combining) rather than a plain `°`.
2. Dead keys. `´` is čárka, `ˇ` is háček, `¨` is diaeresis.
3. `IntlBackslash`, the extra ISO key.

Note that `Y` and `Z` are swapped compared to US, and digits need Shift.

### Composition (dead key, then letter)

| Dead key | Produces |
|---|---|
| `´` | á é í ó ú ý, Á É Í Ó Ú Ý |
| `ˇ` | č ď ě ň ř š ť ž, Č Ď Ě Ň Ř Š Ť Ž |
| `¨` | ä ë ö ü (rare, supported but not taught) |

A dead key followed by Space produces the accent character itself.

Characters with a dedicated key (`ě š č ř ž ý á í é ú ů`) are taught on that key. Characters only reachable through a dead key (`ó ď ň ť` and all uppercase accented letters) are taught as two strokes. `strokesFor` must return the dedicated key when one exists, so the trainer never teaches the slower path.

### Input detail

The engine compares final characters only. Whether `č` came from the dedicated key or from `ˇ` + `c` doesn't matter for correctness; for per-key stats, the keystroke is attributed to the key(s) in `strokesFor`.

## Lesson order

Letters unlock in pairs, one key per hand where possible, starting on the home row. A pair unlocks when every unlocked character meets the targets (see ARCHITECTURE.md, `core/adaptive`).

### `en-us`

1. `f j`
2. `d k`
3. `s l`
4. `a` (and Space from the start)
5. `e i`
6. `r u`
7. `t o`
8. `n h`
9. `g c`
10. `m p`
11. `w y`
12. `b v`
13. `x q`
14. `z`

### `cs-qwertz`

1. `f j`
2. `d k`
3. `s l`
4. `a`
5. `e i`
6. `o n`
7. `t r`
8. `v u`
9. `p m`
10. `h c`
11. `z y`
12. `b g`
13. `x w q`
14. `á í é` (number row, right hand)
15. `ě š č` (number row, left hand)
16. `ř ž ý`
17. `ú ů`

### Other tracks

These start once the letter track reaches step 8 (`en-us`) or step 10 (`cs-qwertz`), and each can be turned on independently:

- **Capitals and punctuation:** Shift (opposite hand), then `.` `,`, then `?` `!` `'` `"` `:` `;` `-`, then brackets.
- **Numbers:** `1`–`5`, then `6`–`0`. On `cs-qwertz` this also teaches Shift on the number row.
- **Code:** brackets `() [] {}`, then `= + - * / < >`, then `_ & | ! ? : ;` and quotes, then Enter for newlines. Snippets come from `src/data/code/` (and from the model server when configured).

## Word lists

- `src/data/words/en.txt` and `cs.txt`: lowercase, one word per line, ordered by frequency, about 10 000 words each.
- Each must have a license compatible with MIT. Record source, license, and processing steps in `src/data/SOURCES.md`.
- A small script in `scripts/` normalizes a raw list: lowercase, Unicode NFC, dedupe, drop words with characters the layout can't produce.
- Profanity filtering is applied in the script, not at runtime.
