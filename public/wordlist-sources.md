# Danish wordlist

`wordlist.txt` is the canonical Ordbomben wordlist. It combines the original Ordbomben Supabase export with DSDO, then normalizes to lowercase Danish words.

- Current generated size: 1,868,285 words.
- Public app path after deployment: `/wordlist.txt`.
- GitHub path after commit: `public/wordlist.txt`.

Source availability can change over time. The generation stats for this build are in `wordlist-stats.json`.

Main sources:

- Original Ordbomben Supabase export: 265,470 words after dedupe and rebuilt extras.
- DSDO, Den store danske ordliste: `https://github.com/mortenivar/dsdo`

DSDO is GPL-2.0 licensed. A copy of its license and third-party permissions is stored in `docs/third-party/dsdo/`.
