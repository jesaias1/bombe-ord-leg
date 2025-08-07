-- Clear existing syllables and populate with data-driven syllables
DELETE FROM syllables;

-- Insert syllables based on actual word count analysis
-- This finds all 2-3 letter combinations that appear in at least 14 words
WITH syllable_analysis AS (
  -- Extract 2-letter combinations from start, middle, and end of words
  SELECT 
    substring(lower(word), i, 2) as syllable,
    COUNT(DISTINCT word) as word_count
  FROM danish_words,
  generate_series(1, length(word) - 1) as i
  WHERE length(substring(lower(word), i, 2)) = 2
    AND substring(lower(word), i, 2) ~ '^[a-zæøå]+$'
  GROUP BY substring(lower(word), i, 2)
  HAVING COUNT(DISTINCT word) >= 14
  
  UNION ALL
  
  -- Extract 3-letter combinations from start, middle, and end of words
  SELECT 
    substring(lower(word), i, 3) as syllable,
    COUNT(DISTINCT word) as word_count
  FROM danish_words,
  generate_series(1, length(word) - 2) as i
  WHERE length(substring(lower(word), i, 3)) = 3
    AND substring(lower(word), i, 3) ~ '^[a-zæøå]+$'
  GROUP BY substring(lower(word), i, 3)
  HAVING COUNT(DISTINCT word) >= 14
),
syllable_with_difficulty AS (
  SELECT 
    syllable,
    word_count,
    CASE 
      WHEN word_count >= 80 THEN 'let'::difficulty_level
      WHEN word_count >= 40 THEN 'mellem'::difficulty_level  
      ELSE 'svaer'::difficulty_level
    END as difficulty
  FROM syllable_analysis
)
INSERT INTO syllables (syllable, difficulty, word_count)
SELECT syllable, difficulty, word_count
FROM syllable_with_difficulty
ORDER BY word_count DESC;