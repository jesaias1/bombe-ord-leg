
import { importComprehensiveWords } from './comprehensiveWordImport';
import { ensureBasicWords } from './ensureBasicWords';

export const runComprehensiveImportNow = async () => {
  console.log('🚀 Auto-running comprehensive Danish word import to fix missing words...');
  
  try {
    // Ensure basic words first
    await ensureBasicWords();
    
    // Run comprehensive import
    const result = await importComprehensiveWords();
    
    console.log('✅ Comprehensive import completed successfully:', result);
    console.log(`Added ${result.imported} words including essential missing words like "sindssygt"`);
    
    return result;
  } catch (error) {
    console.error('❌ Comprehensive import failed:', error);
    throw error;
  }
};

// Auto-run the comprehensive import immediately
runComprehensiveImportNow().then(result => {
  console.log('🎉 Auto-comprehensive import finished:', result);
}).catch(error => {
  console.error('💥 Auto-comprehensive import error:', error);
});
