import { supabase } from '@/integrations/supabase/client';

// Keep a small memory of recently used syllables to avoid immediate repetition
let recentSyllables: string[] = [];
const MAX_RECENT = 8; // Increased memory to avoid more repetition

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  
  try {
    // Get ALL syllables for the difficulty that have at least 1 word
    // Don't filter by word count to avoid bias toward common syllables
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 1) // Only require at least 1 word, not many
      .order('syllable'); // Order for consistent results

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    console.log(`Found ${syllables.length} total syllables for difficulty ${difficulty}`);

    // Filter out recently used syllables to ensure variety
    let availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    
    // If we've used too many recently, reset the memory but keep the last few
    if (availableSyllables.length < Math.max(3, syllables.length * 0.2)) {
      console.log('Resetting recent syllables memory for more variety');
      // Keep only the most recent 3 syllables to avoid immediate repetition
      recentSyllables = recentSyllables.slice(-3);
      availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    }

    // If still no options, use all syllables (shouldn't happen with proper data)
    if (availableSyllables.length === 0) {
      availableSyllables = syllables;
      recentSyllables = [];
    }

    // Use crypto random for better randomness - completely ignore word count weighting
    const getRandomIndex = () => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % availableSyllables.length;
    };

    const randomIndex = getRandomIndex();
    const selectedSyllable = availableSyllables[randomIndex].syllable;
    const wordCount = availableSyllables[randomIndex].word_count;

    // Update recent syllables memory
    recentSyllables.push(selectedSyllable);
    if (recentSyllables.length > MAX_RECENT) {
      recentSyllables.shift();
    }

    console.log(`Selected syllable: "${selectedSyllable}" (${wordCount} words) from ${availableSyllables.length} available options`);
    console.log('Recent syllables:', recentSyllables);
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
