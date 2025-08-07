
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting syllable for difficulty: ${difficulty}`);
  
  try {
    // Query ALL syllables from database with minimal filtering for maximum variety
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gt('word_count', 3) // Very low threshold for maximum variety
      .order('syllable'); // Order by syllable name for consistent but not predictable results

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    console.log(`Found ${syllables.length} syllables for difficulty ${difficulty}`);

    // Simple but effective randomization - use current timestamp as additional entropy
    const timestamp = Date.now();
    const randomSeed = (timestamp % 1000) + Math.random() * 1000;
    const randomIndex = Math.floor(randomSeed) % syllables.length;

    const selectedSyllable = syllables[randomIndex];
    console.log(`Selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words) - index ${randomIndex}/${syllables.length}`);
    
    return selectedSyllable.syllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
