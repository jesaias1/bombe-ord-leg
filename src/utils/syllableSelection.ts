
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
      .gte('word_count', 20) // Higher threshold for better word coverage
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 4)
      .order('word_count', { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      // Filter out problematic syllables and ensure they're good for gameplay
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 4 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Exclude consonant clusters that are hard to use
          !['ng', 'st', 'nd', 'nt', 'mp', 'nk', 'sk', 'sp', 'sn', 'sl', 'sm', 'sw', 'tw', 'dw', 'kw', 'ck', 'ft', 'pt', 'kt'].includes(syllable) &&
          // Avoid starting with double consonants
          !/^[bcdfghjklmnpqrstvwxz]{2}/.test(syllable) &&
          // Ensure it's pronounceable (no triple consonants)
          !/[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
          // Exclude single consonants
          syllable.length > 1
        );
      });

      if (validSyllables.length > 0) {
        // Weight selection towards syllables with more words
        const weightedSelection = [];
        for (const syllableData of validSyllables) {
          const weight = Math.min(syllableData.word_count, 100); // Cap weight at 100
          for (let i = 0; i < weight; i++) {
            weightedSelection.push(syllableData.syllable);
          }
        }
        
        const randomIndex = Math.floor(Math.random() * weightedSelection.length);
        const selectedSyllable = weightedSelection[randomIndex];
        console.log(`Selected syllable from database: "${selectedSyllable}"`);
        return selectedSyllable;
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables
  console.log('Using fallback curated syllables');
  const syllables = CURATED_SYLLABLES[difficulty];
  const randomIndex = Math.floor(Math.random() * syllables.length);
  const selectedSyllable = syllables[randomIndex];
  
  console.log(`Selected fallback syllable: "${selectedSyllable}"`);
  return selectedSyllable;
};
