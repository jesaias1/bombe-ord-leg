-- Make all difficulties much more playable with higher word count requirements
-- Focus on truly common syllables that players can easily work with

-- Remove more problematic syllables regardless of word count
DELETE FROM syllables 
WHERE syllable IN (
  'tss', 'gts', 'ldt', 'pts', 'kts', 'nts', 'rts', 'sts', 'bts',
  'cci', 'tti', 'ppi', 'ssi', 'lli', 'rri', 'nni', 'mmi',
  'xx', 'zz', 'qq', 'www', 'yyy'
) OR syllable LIKE '%ts%' 
  OR syllable LIKE '%dt%'
  OR syllable LIKE '%pt%'
  OR syllable LIKE '%kt%'
  OR syllable LIKE '%nt%'
  OR syllable LIKE '%rt%'
  OR syllable LIKE '%st%'
  OR syllable LIKE '%bt%';

-- Significantly increase word count thresholds for much easier gameplay
UPDATE syllables 
SET difficulty = CASE 
  WHEN word_count >= 5000 THEN 'let'::difficulty_level     -- Easy: 5000+ words (extremely common)
  WHEN word_count >= 2500 THEN 'mellem'::difficulty_level  -- Medium: 2500-4999 words (very common)
  WHEN word_count >= 1000 THEN 'svaer'::difficulty_level   -- Hard: 1000-2499 words (common)
  ELSE 'svaer'::difficulty_level                           -- Fallback to hard
END;

-- Remove syllables that are still not common enough
DELETE FROM syllables 
WHERE word_count < 1000;