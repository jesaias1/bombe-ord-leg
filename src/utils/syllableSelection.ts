
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  const { data, error } = await supabase
    .from('syllables')
    .select('syllable')
    .eq('difficulty', difficulty)
    .gt('word_count', 10);

  if (error || !data || data.length === 0) {
    console.error('Error fetching syllables:', error);
    return null;
  }

  const randomIndex = Math.floor(Math.random() * data.length);
  const selectedSyllable = data[randomIndex].syllable;
  
  console.log(`Selected syllable: "${selectedSyllable}" from ${data.length} available syllables`);
  return selectedSyllable;
};
