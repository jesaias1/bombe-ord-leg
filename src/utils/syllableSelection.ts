import { supabase } from '@/integrations/supabase/client';

// Keep a small memory of recently used syllables to avoid immediate repetition
let recentSyllables: string[] = [];
const MAX_RECENT = 5; // Reduced to allow more syllables back into rotation faster

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable - expanding variety across all difficulties`);
  
  try {
    // Get ALL syllables regardless of difficulty, even those with fewer words
    // This significantly expands our pool for better variety
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count, difficulty')
      .gte('word_count', 0) // Include even syllables with 0 words to maximize variety
      .order('syllable'); // Order for consistent results

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found');
      return null;
    }

    console.log(`Found ${syllables.length} total syllables across all difficulties and word counts`);

    // Less aggressive filtering - allow more syllables to be available
    let availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    
    // Reset memory more aggressively to ensure variety
    if (availableSyllables.length < Math.max(20, syllables.length * 0.3)) {
      console.log('Aggressively resetting recent syllables memory for maximum variety');
      // Keep only the most recent 2 syllables to avoid immediate repetition
      recentSyllables = recentSyllables.slice(-2);
      availableSyllables = syllables.filter(s => !recentSyllables.includes(s.syllable));
    }

    // If still no options, use all syllables
    if (availableSyllables.length === 0) {
      availableSyllables = syllables;
      recentSyllables = [];
    }

    // Create a more balanced weighting system that prioritizes variety
    const createExpandedWeightedSelection = () => {
      const weights: number[] = [];
      
      availableSyllables.forEach(syllable => {
        // Much stronger base weight for pure randomness
        const baseWeight = 50; // Very strong base for maximum randomness
        
        // Very small bonus for usability, but not overwhelming
        let usabilityBonus = 0;
        if (syllable.word_count > 0) {
          usabilityBonus = Math.log(syllable.word_count + 1) * 0.5; // Minimal bonus
        }
        
        // Small preference for certain difficulties to maintain some structure
        let difficultyBonus = 0;
        if (syllable.difficulty === difficulty) {
          difficultyBonus = 2; // Very small preference for requested difficulty
        }
        
        weights.push(baseWeight + usabilityBonus + difficultyBonus);
      });
      
      return weights;
    };

    const weights = createExpandedWeightedSelection();
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Use crypto random for selection
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const randomValue = (array[0] / 4294967295) * totalWeight;
    
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
    const syllableDifficulty = availableSyllables[selectedIndex].difficulty;

    // Update recent syllables memory
    recentSyllables.push(selectedSyllable);
    if (recentSyllables.length > MAX_RECENT) {
      recentSyllables.shift();
    }

    console.log(`Selected syllable: "${selectedSyllable}" (${wordCount} words, ${syllableDifficulty} difficulty) from ${availableSyllables.length} available options`);
    console.log('Recent syllables:', recentSyllables);
    console.log('Available pool size:', availableSyllables.length, 'out of', syllables.length, 'total syllables');
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
