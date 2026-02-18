-- Adjust difficulty levels to make medium easier and ensure all syllables have sufficient words
UPDATE syllables 
SET difficulty = CASE 
  WHEN word_count >= 1000 THEN 'let'::difficulty_level     -- Easy: 1000+ words
  WHEN word_count >= 500 THEN 'mellem'::difficulty_level   -- Medium: 500-999 words  
  WHEN word_count >= 200 THEN 'svaer'::difficulty_level    -- Hard: 200-499 words
  ELSE 'svaer'::difficulty_level                           -- Fallback to hard
END;

-- Remove syllables with too few words to ensure playability
DELETE FROM syllables 
WHERE word_count < 200;