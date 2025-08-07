
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting syllable for difficulty: ${difficulty}`);
  
  try {
    // Query syllables from database with word count filtering
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gt('word_count', 10) // Only syllables with at least 10 words
      .order('word_count', { ascending: false }); // Prefer syllables with more words

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    // Use weighted random selection - syllables with more words are more likely to be selected
    const totalWeight = syllables.reduce((sum, s) => sum + s.word_count, 0);
    const randomValue = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const syllable of syllables) {
      currentWeight += syllable.word_count;
      if (randomValue <= currentWeight) {
        console.log(`Selected syllable: "${syllable.syllable}" (${syllable.word_count} words)`);
        return syllable.syllable;
      }
    }

    // Fallback to simple random selection if weighted selection fails
    const randomIndex = Math.floor(Math.random() * syllables.length);
    const selectedSyllable = syllables[randomIndex];
    console.log(`Fallback selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words)`);
    
    return selectedSyllable.syllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
