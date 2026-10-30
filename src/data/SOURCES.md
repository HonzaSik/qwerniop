# Data sources

## `words/en.txt`

- **Source:** Leipzig Corpora Collection (Wortschatz Leipzig), `eng_news_2020_100K`, the `-words.txt` file (100 000 sentences of English news text, 2020; columns: id, word form, count).
- **URL:** https://downloads.wortschatz-leipzig.de/corpora/eng_news_2020_100K.tar.gz (SHA-256 of the archive: `6cad210ef3d61d28b76f79f4eef53050aa52dff8dfb855a9de9dcb46658428fc`, downloaded 2026-10-30). Project page: https://wortschatz.uni-leipzig.de/en/download/English
- **License:** Creative Commons Attribution (CC BY). The terms of usage (https://wortschatz.uni-leipzig.de/en/usage) state: "The text corpora offered for download are made available under the Creative Commons licence CC BY." Attribution is the only condition and is compatible with MIT. The page does not name a license version; the terms page was not machine-readable when this was recorded (bot check), so the quote comes from the published terms as found by web search. Recheck it when the Czech list is added.
- **Attribution:** D. Goldhahn, T. Eckart & U. Quasthoff: Building Large Monolingual Dictionaries at the Leipzig Corpora Collection: From 100 to 200 Languages. In: Proceedings of the 8th International Language Resources and Evaluation Conference (LREC 2012). Word list derived from the Leipzig Corpora Collection, Universität Leipzig, CC BY.
- **Transformation** (one-off, awk and sort; the normalization script in `scripts/` will replace it):
  1. Keep word forms made only of ASCII letters `A-Za-z` (drops punctuation, digits, apostrophes, hyphens).
  2. Lowercase and sum counts of case variants.
  3. Drop a word when its lowercase form is under 70 % of its total count (removes proper nouns such as names).
  4. Drop one-letter words except `a` and `i`.
  5. Sort by summed count descending, ties alphabetical, keep the first 10 000.
  6. Remove `rape`, `raped`, `shit`, `porn`, `fuck`, `ass` by hand (profanity). No profanity list was applied beyond a spot check of common terms; the script will apply a proper one.
- **Result:** 9 994 lines, ASCII (so already NFC), about 36 KB gzip. SHA-256 of `en.txt`: `730b9779908e8b459a4029093591f28fbbf1983704255f6f11778b42a4943292`.
- **Known limits:** news vocabulary skews towards politics and business; contractions are absent.
