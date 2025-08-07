
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting syllable for difficulty: ${difficulty}`);
  
  try {
    // Query syllables from database with random ordering from database
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 5) // Only syllables with at least 5 words
      .order('syllable'); // Get consistent ordering first

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    console.log(`Found ${syllables.length} syllables for difficulty ${difficulty}`);

    // Use multiple sources of randomness combined for maximum entropy
    const now = performance.now();
    const seed1 = Math.random() * 1000000;
    const seed2 = (now % 10000) / 10000;
    const seed3 = Math.random();
    
    // Combine seeds and use modulo to get index
    const combinedSeed = (seed1 + seed2 + seed3) % 1;
    const randomIndex = Math.floor(combinedSeed * syllables.length);

    const selectedSyllable = syllables[randomIndex];
    console.log(`Selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words) - index ${randomIndex}/${syllables.length} with seeds: ${seed1.toFixed(3)}, ${seed2.toFixed(3)}, ${seed3.toFixed(3)}`);
    
    return selectedSyllable.syllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
