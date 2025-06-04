
import { supabase } from '@/integrations/supabase/client';

// Curated list of common Danish syllables that create many valid words
const CURATED_SYLLABLES = {
  'let': [
    'er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne',
    'me', 'ge', 'be', 'he', 'pe', 've', 'fe', 'je', 'at', 'og',
    'in', 'an', 'on', 'ar', 'or', 'el', 'al', 'ul', 'il', 'ol'
  ],
  'mellem': [
    'ing', 'end', 'and', 'hed', 'ter', 'der', 'ner', 'ler', 'rer', 'ser',
    'ker', 'ger', 'ber', 'per', 'ver', 'fer', 'mer', 'her', 'ste', 'nde',
    'nne', 'lle', 'rre', 'sse', 'tte', 'kke', 'mme', 'nge', 'rse', 'lse'
  ],
  'svaer': [
    'tion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting',
    'ende', 'ande', 'inde', 'unde', 'erde', 'orde', 'ilde', 'else', 'anse',
    'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste', 'erte', 'arte'
  ]
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  try {
    // Try to get syllables from database with good word coverage
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 15) // Slightly lower threshold for more variety
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 4)
      .order('word_count', { ascending: false })
      .limit(200); // Increased limit for more variety

    if (data && data.length > 0) {
      // Filter out problematic syllables but be less restrictive for better variety
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 4 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Only exclude the most problematic consonant clusters
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp'].includes(syllable) &&
          // Avoid starting with triple consonants
          !/^[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
          // Exclude single consonants
          syllable.length > 1
        );
      });

      if (validSyllables.length > 0) {
        // Use a more balanced approach - mix random selection with weighted selection
        const useRandomSelection = Math.random() < 0.5; // 50% chance for pure random
        
        if (useRandomSelection || validSyllables.length < 10) {
          // Pure random selection for better variety
          const randomIndex = Math.floor(Math.random() * validSyllables.length);
          const selectedSyllable = validSyllables[randomIndex].syllable;
          console.log(`Selected syllable from database (random): "${selectedSyllable}"`);
          return selectedSyllable;
        } else {
          // Weighted selection but with reduced weight differences
          const weightedSelection = [];
          for (const syllableData of validSyllables) {
            const weight = Math.min(Math.max(syllableData.word_count / 5, 1), 10); // Reduced weight range
            for (let i = 0; i < weight; i++) {
              weightedSelection.push(syllableData.syllable);
            }
          }
          
          const randomIndex = Math.floor(Math.random() * weightedSelection.length);
          const selectedSyllable = weightedSelection[randomIndex];
          console.log(`Selected syllable from database (weighted): "${selectedSyllable}"`);
          return selectedSyllable;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables with better shuffling
  console.log('Using fallback curated syllables');
  const syllables = [...CURATED_SYLLABLES[difficulty]]; // Create a copy
  
  // Fisher-Yates shuffle for better randomization
  for (let i = syllables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [syllables[i], syllables[j]] = [syllables[j], syllables[i]];
  }
  
  const selectedSyllable = syllables[0];
  console.log(`Selected fallback syllable: "${selectedSyllable}"`);
  return selectedSyllable;
};
