
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  const { data, error } = await supabase
    .from('syllables')
    .select('syllable')
    .eq('difficulty', difficulty)
    .gte('word_count', 10)
    .gte('length(syllable)', 2); // Ensure syllables are at least 2 characters

  if (error || !data || data.length === 0) {
    console.error('Error fetching syllables:', error);
    
    // Fallback to simple syllables if database query fails
    const fallbackSyllables = {
      'let': ['ing', 'end', 'er', 'en', 'de', 'le', 'se', 'te', 'ke', 're'],
      'mellem': ['tion', 'ning', 'hed', 'ing', 'ende', 'ste', 'ling', 'ring', 'else', 'ner'],
      'svaer': ['ation', 'ering', 'ation', 'ning', 'ende', 'ling', 'ring', 'else', 'hed', 'tion']
    };
    
    const syllables = fallbackSyllables[difficulty];
    const randomIndex = Math.floor(Math.random() * syllables.length);
    return syllables[randomIndex];
  }

  // Filter out very short or problematic syllables
  const validSyllables = data.filter(s => 
    s.syllable.length >= 2 && 
    !['ng', 'st', 'nd', 'nt', 'mp', 'nk', 'sk', 'sp', 'sn'].includes(s.syllable.toLowerCase())
  );

  if (validSyllables.length === 0) {
    console.warn('No valid syllables found, using fallback');
    return 'ing'; // Safe fallback
  }

  const randomIndex = Math.floor(Math.random() * validSyllables.length);
  const selectedSyllable = validSyllables[randomIndex].syllable;
  
  console.log(`Selected syllable: "${selectedSyllable}" from ${validSyllables.length} valid syllables`);
  return selectedSyllable;
};
