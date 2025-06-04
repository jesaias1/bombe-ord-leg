
import { supabase } from '@/integrations/supabase/client';

// Curated list of common Danish syllables that are likely to have many words
const CURATED_SYLLABLES = {
  'let': [
    'er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne',
    'me', 'ge', 'be', 'he', 'pe', 've', 'fe', 'je', 'at', 'og',
    'in', 'an', 'on', 'un', 'ar', 'or', 'ur', 'ir', 'el', 'al'
  ],
  'mellem': [
    'ing', 'end', 'and', 'hed', 'ter', 'der', 'ner', 'ler', 'rer', 'ser',
    'ker', 'ger', 'ber', 'per', 'ver', 'fer', 'mer', 'her', 'ste', 'nde',
    'nne', 'lle', 'rre', 'sse', 'tte', 'kke', 'mme', 'nge', 'rse', 'lse'
  ],
  'svaer': [
    'tion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'wing', 'ting',
    'ende', 'ande', 'inde', 'unde', 'erde', 'orde', 'ilde', 'else', 'anse',
    'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste', 'erte', 'arte'
  ]
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  try {
    // First try to get syllables from database that have good word coverage
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 15) // Ensure good word coverage
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 4)
      .order('word_count', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      // Filter out problematic syllables
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 4 &&
          // Exclude consonant clusters and problematic combinations
          !['ng', 'st', 'nd', 'nt', 'mp', 'nk', 'sk', 'sp', 'sn', 'sl', 'sm', 'sw', 'tw', 'dw', 'kw'].includes(syllable) &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Avoid starting with double consonants
          !/^[bcdfghjklmnpqrstvwxz]{2}/.test(syllable) &&
          // Ensure it's pronounceable
          !/[bcdfghjklmnpqrstvwxz]{3}/.test(syllable)
        );
      });

      if (validSyllables.length > 0) {
        const randomIndex = Math.floor(Math.random() * validSyllables.length);
        const selectedSyllable = validSyllables[randomIndex].syllable;
        console.log(`Selected syllable from database: "${selectedSyllable}" (${validSyllables[randomIndex].word_count} words)`);
        return selectedSyllable;
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables if database query fails or returns no results
  console.log('Using fallback curated syllables');
  const syllables = CURATED_SYLLABLES[difficulty];
  const randomIndex = Math.floor(Math.random() * syllables.length);
  const selectedSyllable = syllables[randomIndex];
  
  console.log(`Selected fallback syllable: "${selectedSyllable}"`);
  return selectedSyllable;
};
