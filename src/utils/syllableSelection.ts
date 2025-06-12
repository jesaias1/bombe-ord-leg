
import { DANISH_SYLLABLES } from './danishSyllables';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting Danish syllable (this function is now deprecated, use game syllables instead)`);
  
  try {
    // Fallback for backward compatibility
    const selectedSyllable = DANISH_SYLLABLES[Math.floor(Math.random() * DANISH_SYLLABLES.length)];
    
    console.log(`Selected Danish syllable: "${selectedSyllable}"`);
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
