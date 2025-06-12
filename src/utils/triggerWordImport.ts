
import { importEnhancedWords } from './improvedWordImport';
import { ensureBasicWords } from './ensureBasicWords';

export const expandWordDatabase = async () => {
  console.log('Starting comprehensive Danish word database expansion...');
  
  try {
    // First ensure we have basic words
    await ensureBasicWords();
    
    // Then run the enhanced import for comprehensive coverage
    const result = await importEnhancedWords();
    
    console.log('Word database expansion complete:', result);
    return result;
  } catch (error) {
    console.error('Error expanding word database:', error);
    throw error;
  }
};
