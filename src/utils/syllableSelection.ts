
import { getRandomDanishSyllable } from './danishSyllables';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting Danish syllable (difficulty setting ignored for better variety)`);
  
  try {
    // Use our comprehensive Danish syllable system
    const selectedSyllable = getRandomDanishSyllable();
    
    console.log(`Selected Danish syllable: "${selectedSyllable}"`);
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
