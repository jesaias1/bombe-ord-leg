# Wordlist Import

`public/wordlist.txt` is the canonical wordlist and currently contains 1,868,285 words.

The previous SQL chunk files were generated for the smaller pre-DSDO list, so they were removed to avoid importing an outdated dictionary by accident.

If the Supabase `danish_words` table should also receive the full DSDO-enhanced list, generate fresh import chunks from `public/wordlist.txt` or import it as a CSV through Supabase tooling.

Current gameplay still validates against the active Supabase database, so adding DSDO to `public/wordlist.txt` makes the public wordlist larger immediately, but DSDO-only words will not be accepted in-game until they are imported into `public.danish_words`.
