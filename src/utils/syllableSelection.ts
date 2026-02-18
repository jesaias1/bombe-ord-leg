
import { supabase } from '@/integrations/supabase/client';

// Track recently used syllables to avoid repetition
const recentSyllables: string[] = [];
const MAX_RECENT = 10; // Remember last 10 syllables

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer', usedSyllablesInGame: string[] = []): Promise<string | null> => {
  console.log(`Selecting syllable for difficulty: ${difficulty}`);
  
  try {
    // Query syllables from database
    const { data: syllables, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 5) // Only syllables with at least 5 words
      .order('syllable');

    if (error) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    if (!syllables || syllables.length === 0) {
      console.error('No syllables found for difficulty:', difficulty);
      return null;
    }

    console.log(`Found ${syllables.length} syllables for difficulty ${difficulty}`);

    // Filter out recently used syllables to reduce repetition
    const allUsed = [...new Set([...recentSyllables, ...usedSyllablesInGame])];
    const availableSyllables = syllables.filter(s => !allUsed.includes(s.syllable));
    
    // If we've used all syllables, reset and use all available
    const poolToUse = availableSyllables.length > 0 ? availableSyllables : syllables;
    
    // Use crypto API for better randomness
    const randomArray = new Uint32Array(1);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(randomArray);
      const cryptoRandom = randomArray[0] / (0xFFFFFFFF + 1);
      const randomIndex = Math.floor(cryptoRandom * poolToUse.length);
      const selectedSyllable = poolToUse[randomIndex];
      
      // Track this syllable as recently used
      recentSyllables.push(selectedSyllable.syllable);
      if (recentSyllables.length > MAX_RECENT) {
        recentSyllables.shift(); // Remove oldest
      }
      
      console.log(`Selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words) from pool of ${poolToUse.length} - recent: ${recentSyllables.length}`);
      return selectedSyllable.syllable;
    }
    
    // Fallback to Math.random with multiple entropy sources
    const now = performance.now();
    const seed1 = Math.random() * 1000000;
    const seed2 = (now % 10000) / 10000;
    const seed3 = Math.random();
    const combinedSeed = (seed1 + seed2 + seed3) % 1;
    const randomIndex = Math.floor(combinedSeed * poolToUse.length);
    
    const selectedSyllable = poolToUse[randomIndex];
    
    // Track this syllable
    recentSyllables.push(selectedSyllable.syllable);
    if (recentSyllables.length > MAX_RECENT) {
      recentSyllables.shift();
    }
    
    console.log(`Selected syllable: "${selectedSyllable.syllable}" (${selectedSyllable.word_count} words) from pool of ${poolToUse.length}`);
    return selectedSyllable.syllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
