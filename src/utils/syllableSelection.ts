
import { DANISH_SYLLABLES } from './danishSyllables';

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting Danish syllable for difficulty: ${difficulty}`);
  
  try {
    // Select a random syllable from the comprehensive list
    const selectedSyllable = DANISH_SYLLABLES[Math.floor(Math.random() * DANISH_SYLLABLES.length)];
    
    console.log(`Selected Danish syllable: "${selectedSyllable}"`);
    
    return selectedSyllable;
  } catch (error) {
    console.error('Error in selectRandomSyllable:', error);
    return null;
  }
};
