import { supabase } from '@/integrations/supabase/client';

// Keep a small memory of recently used syllables to avoid immediate repetition
let recentSyllables: string[] = [];
const MAX_RECENT = 8; // Increased memory to avoid more repetition

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable - ignoring difficulty for better randomness`);
  
  try {
    // Get ALL syllables regardless of difficulty that have at least 1 word
    // This gives us the full spectrum for true randomness
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .gte('word_count', 1) // Only require at least 1 word
      .order('syllable'); // Order for consistent results

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found');
      return null;
    }

    console.log(`Found ${syllables.length} total syllables across all difficulties`);

    // Filter out recently used syllables to ensure variety
    let availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    
    // If we've used too many recently, reset the memory but keep the last few
    if (availableSyllables.length < Math.max(5, syllables.length * 0.15)) {
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

    // Create weighted selection that balances randomness with usability
    // Syllables with more words get slight preference, but not overwhelming
    const createWeightedSelection = () => {
      const weights: number[] = [];
      const maxWordCount = Math.max(...availableSyllables.map(s => s.word_count));
      
      // Create weights that give slight preference to syllables with more words
      // but still allow for good randomness
      availableSyllables.forEach(syllable => {
        // Base weight of 1 for all syllables (ensures randomness)
        // Plus small bonus based on word count (ensures usability)
        const baseWeight = 10; // Strong base for randomness
        const wordCountBonus = Math.log(syllable.word_count + 1) * 2; // Gentle logarithmic bonus
        weights.push(baseWeight + wordCountBonus);
      });
      
      return weights;
    };

    const weights = createWeightedSelection();
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Use crypto random for selection
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomValue = (array[0] / 4294967295) * totalWeight; // Convert to 0-1 range then scale
    
    let cumulativeWeight = 0;
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
      cumulativeWeight += weights[i];
      if (randomValue <= cumulativeWeight) {
        selectedIndex = i;
        break;
      }
    }

    const selectedSyllable = availableSyllables[selectedIndex].syllable;
    const wordCount = availableSyllables[selectedIndex].word_count;

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
