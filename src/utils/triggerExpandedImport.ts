
import { expandWordDatabase } from './triggerWordImport';

export const runExpandedImport = async () => {
  console.log('Starting expanded Danish word import with inflections...');
  
  try {
    const result = await expandWordDatabase();
    console.log('Expanded import completed:', result);
    return result;
  } catch (error) {
    console.error('Error during expanded import:', error);
    throw error;
  }
};

// Auto-run the expanded import when this module is loaded
runExpandedImport().then(result => {
  console.log('Auto-triggered expanded import result:', result);
}).catch(error => {
  console.error('Auto-triggered expanded import error:', error);
});
