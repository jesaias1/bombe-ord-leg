import { supabase } from '@/integrations/supabase/client';

// Keep a small memory of recently used syllables to avoid immediate repetition
let recentSyllables: string[] = [];
const MAX_RECENT = 5; // Smaller memory for better variety

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  try {
    // Get all syllables for the difficulty that actually have words in the dictionary
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', difficulty)
      .gt('word_count', 0) // Only syllables that have actual words
      .order('syllable'); // Order for consistent results

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    // Filter out recently used syllables if we have enough options
    let availableSyllables = syllables;
    if (syllables.length > MAX_RECENT * 2) {
      availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    }

    // If filtering left us with too few options, use all syllables
    if (availableSyllables.length < 3) {
      availableSyllables = syllables;
      recentSyllables = []; // Reset memory
    }

    // Use crypto random for better randomness
    const getRandomIndex = () => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % availableSyllables.length;
    };

    const randomIndex = getRandomIndex();
    const selectedSyllable = availableSyllables[randomIndex].syllable;

    // Update recent syllables memory
    recentSyllables.push(selectedSyllable);
    if (recentSyllables.length > MAX_RECENT) {
      recentSyllables.shift();
    }

    console.log(`Selected syllable: "${selectedSyllable}" from ${availableSyllables.length} available options`);
    console.log('Recent syllables:', recentSyllables);
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
