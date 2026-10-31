# Data sources

## `words/en.txt`

- **Source:** Leipzig Corpora Collection (Wortschatz Leipzig), `eng_news_2020_100K`, the `-words.txt` file (100 000 sentences of English news text, 2020; columns: id, word form, count).
- **URL:** https://downloads.wortschatz-leipzig.de/corpora/eng_news_2020_100K.tar.gz (SHA-256 of the archive: `6cad210ef3d61d28b76f79f4eef53050aa52dff8dfb855a9de9dcb46658428fc`, downloaded 2026-10-30). Project page: https://wortschatz.uni-leipzig.de/en/download/English
- **License:** Creative Commons Attribution (CC BY). The terms of usage (https://wortschatz.uni-leipzig.de/en/usage) state: "The text corpora offered for download are made available under the Creative Commons licence CC BY." Attribution is the only condition and is compatible with MIT. The page does not name a license version; the terms page was not machine-readable when this was recorded (bot check), so the quote comes from the published terms as found by web search. Rechecked for the Czech list: a web search of the same page returned the same CC BY statement for downloadable corpora (the page is still behind the bot check).
- **Attribution:** D. Goldhahn, T. Eckart & U. Quasthoff: Building Large Monolingual Dictionaries at the Leipzig Corpora Collection: From 100 to 200 Languages. In: Proceedings of the 8th International Language Resources and Evaluation Conference (LREC 2012). Word list derived from the Leipzig Corpora Collection, Universität Leipzig, CC BY.
- **Transformation:** `node scripts/normalize-words.mjs <raw> en-us --profanity scripts/profanity-en.txt --singles a,i > src/data/words/en.txt`, run on the archive's `-words.txt` (columns id, word form, count). The script:
  1. Lowercases (NFC) and sums counts of case variants.
  2. Keeps only words made of letters that `en-us` can type (drops punctuation, digits, apostrophes, hyphens).
  3. Drops a word when its lowercase form is under 70 % of its total count (removes proper nouns such as names).
  4. Drops one-letter words except `a` and `i`.
  5. Drops words in `scripts/profanity-en.txt`: a hand-written exact-match blocklist (public domain, no third-party source), including inflections. It is deliberately broad (also mild words such as `hell`, `damn`, `sex`) and does not catch every variant.
  6. Sorts by summed count descending, ties alphabetical, keeps the first 10 000.
- **Result:** 10 000 lines, ASCII (so already NFC), about 36 KB gzip. SHA-256 of `en.txt`: `481af9b8062b3ee7921cd6e58caa053182f5f390ce5f5ad6a31f3e2e3d110fd8`.
- **Known limits:** news vocabulary skews towards politics and business; contractions are absent.

## `words/cs.txt`

- **Source:** Leipzig Corpora Collection (Wortschatz Leipzig), `ces_news_2020_100K`, the `-words.txt` file (100 000 sentences of Czech news text, 2020; columns: id, word form, count).
- **URL:** https://downloads.wortschatz-leipzig.de/corpora/ces_news_2020_100K.tar.gz (SHA-256 of the archive: `a76f63adea8e559b283889e8cfd0711b1f1167786537d8bac8bee818640754fe`, downloaded 2026-10-31). Project page: https://wortschatz.uni-leipzig.de/en/download/Czech
- **License:** Creative Commons Attribution (CC BY), same terms and attribution as `words/en.txt` above.
- **Transformation:** `node scripts/normalize-words.mjs <raw> cs-qwertz --profanity scripts/profanity-cs.txt > src/data/words/cs.txt`. Same steps as `en.txt`, except there is no `--singles`, so every one-letter word is dropped. The layout filter uses `cs-qwertz`, so words with diacritics are kept.
- **Profanity:** `scripts/profanity-cs.txt` is a hand-written exact-match blocklist (public domain, no third-party source), broad on purpose (also mild words, sex terms and slurs), with common inflections. It does not catch every inflected form.
- **Result:** 10 000 lines, about 38 KB gzip. SHA-256 of `cs.txt`: `8fb6714bf8575961e10ca07d0a6529c0b448b7b21e29f8ed3cfeb2dca888023c`.
- **Known limits:** news vocabulary; Czech inflection means many forms of one word. The list is not loaded by the app yet (layout switching is a later item), so `size-check` does not see it; its gzip size is under the 60 KB word-list budget.
