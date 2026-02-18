-- Ensure players start with 3 lives and backfill existing players
ALTER TABLE public.players
  ALTER COLUMN lives SET DEFAULT 3;

-- Backfill any players with NULL or <1 lives to 3 (safety)
UPDATE public.players SET lives = 3
WHERE lives IS NULL OR lives < 1;

-- Add word count constraint to prevent too short words
UPDATE public.games 
SET turn_seq = COALESCE(turn_seq, 0)
WHERE turn_seq IS NULL;