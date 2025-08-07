-- Update 'ae' syllable from medium to hard difficulty (using correct enum value)
UPDATE syllables 
SET difficulty = 'svaer' 
WHERE syllable = 'ae' AND difficulty = 'mellem';