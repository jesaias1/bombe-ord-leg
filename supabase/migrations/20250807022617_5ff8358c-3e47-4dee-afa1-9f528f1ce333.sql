-- Update 'ae' syllable from medium to hard difficulty
UPDATE syllables 
SET difficulty = 'svær' 
WHERE syllable = 'ae' AND difficulty = 'mellem';