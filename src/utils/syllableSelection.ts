
import { supabase } from '@/integrations/supabase/client';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting syllable for difficulty: ${difficulty}`);
  
  try {
    // Query syllables from database with word count filtering
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gt('word_count', 5); // Only syllables with at least 5 words to ensure playability

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    // Fisher-Yates shuffle for truly random order
    const shuffledSyllables = [...syllables];
    for (let i = shuffledSyllables.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSyllables[i], shuffledSyllables[j]] = [shuffledSyllables[j], shuffledSyllables[i]];
    }

    // Add additional randomness with crypto random if available
    let randomIndex;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      randomIndex = array[0] % shuffledSyllables.length;
    } else {
      // Multiple random calls for better entropy
      randomIndex = Math.floor(Math.random() * Math.random() * shuffledSyllables.length);
    }

    const selectedSyllable = shuffledSyllables[randomIndex];
    console.log(`Selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words) from ${syllables.length} options`);
    
    return selectedSyllable.syllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
