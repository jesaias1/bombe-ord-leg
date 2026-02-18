-- Add columns to track correct and incorrect words during the game
ALTER TABLE games 
ADD COLUMN correct_words TEXT[] DEFAULT '{}',
ADD COLUMN incorrect_words TEXT[] DEFAULT '{}';