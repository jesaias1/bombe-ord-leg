
import { importExpandedDanishWords } from './expandedDanishImport';
import { ensureBasicWords } from './ensureBasicWords';

export const expandWordDatabase = async () => {
  console.log('Starting comprehensive Danish word database expansion with inflections...');
  
  try {
    // Først sikr vi har grundlæggende ord
    await ensureBasicWords();
    
    // Så kør den udvidede import med bøjninger
    const result = await importExpandedDanishWords();
    
    console.log('Word database expansion with inflections complete:', result);
    return result;
  } catch (error) {
    console.error('Error expanding word database with inflections:', error);
    throw error;
  }
};
