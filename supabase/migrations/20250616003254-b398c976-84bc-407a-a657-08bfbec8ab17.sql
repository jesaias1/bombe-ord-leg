
-- Add columns to store game syllables and current index
ALTER TABLE games 
ADD COLUMN game_syllables TEXT[] DEFAULT NULL,
ADD COLUMN syllable_index INTEGER DEFAULT 0;
