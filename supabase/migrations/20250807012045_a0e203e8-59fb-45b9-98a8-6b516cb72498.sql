-- Make medium difficulty much more playable by increasing word count requirements
-- and removing problematic syllables that are too difficult regardless of word count

-- First, remove specific syllables that are just too hard to play with
DELETE FROM syllables 
WHERE syllable IN (
  'zi', 'azi', 'xi', 'zu', 'xu', 'zø', 'æz', 'øz', 'xj', 'zj', 
  'qw', 'qx', 'qz', 'wx', 'wz', 'xw', 'xz', 'zw', 'zx',
  'dz', 'zt', 'zk', 'zp', 'zb', 'zg', 'zd', 'yz', 'zy'
);

-- Dramatically increase thresholds to ensure medium is truly playable
UPDATE syllables 
SET difficulty = CASE 
  WHEN word_count >= 2000 THEN 'let'::difficulty_level     -- Easy: 2000+ words (very common)
  WHEN word_count >= 800 THEN 'mellem'::difficulty_level   -- Medium: 800-1999 words (common)
  WHEN word_count >= 300 THEN 'svaer'::difficulty_level    -- Hard: 300-799 words (less common)
  ELSE 'svaer'::difficulty_level                           -- Fallback to hard
END;

-- Remove syllables that are still too difficult even for hard mode
DELETE FROM syllables 
WHERE word_count < 300;