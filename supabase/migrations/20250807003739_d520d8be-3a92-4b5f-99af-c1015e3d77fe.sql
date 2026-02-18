-- Make difficulty levels much more realistic for playability
UPDATE syllables 
SET difficulty = CASE 
  WHEN word_count >= 500 THEN 'let'::difficulty_level      -- Easy: 500+ words
  WHEN word_count >= 200 THEN 'mellem'::difficulty_level   -- Medium: 200-499 words  
  ELSE 'svaer'::difficulty_level                           -- Hard: under 200 words
END;

-- Remove syllables that are too difficult even for hard mode
DELETE FROM syllables 
WHERE word_count < 50;