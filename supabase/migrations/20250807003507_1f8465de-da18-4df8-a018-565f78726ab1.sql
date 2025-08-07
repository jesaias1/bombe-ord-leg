-- Fix syllable difficulty classification to be more realistic
UPDATE syllables 
SET difficulty = CASE 
  WHEN word_count >= 200 THEN 'let'::difficulty_level
  WHEN word_count >= 80 THEN 'mellem'::difficulty_level  
  ELSE 'svaer'::difficulty_level
END;

-- Additional check: remove syllables with very few actual words
DELETE FROM syllables 
WHERE word_count < 20;