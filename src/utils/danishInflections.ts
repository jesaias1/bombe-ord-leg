
import { supabase } from '@/integrations/supabase/client';

// Almindelige danske bøjningsendelser
const DANISH_ENDINGS = [
  // Substantiver
  'en', 'erne', 'et', 'ene', 'ets', 'ens', 'ernes',
  // Adjektiver
  'ere', 'este', 'ede', 'ende',
  // Verber
  'ede', 'erede', 'ende', 'erer', 'ede', 'et', 'te', 'de',
  // Adverbier og andre
  'nes', 'rets', 'heds', 'doms', 'skab', 'hed',
  // Sammensatte endelser
  'eren', 'sten', 'sten', 'nde'
];

export const findWordStem = (word: string): string[] => {
  const stems = [word]; // Start med det originale ord
  
  // Prøv at fjerne almindelige danske endelser
  for (const ending of DANISH_ENDINGS) {
    if (word.length > ending.length + 2 && word.endsWith(ending)) {
      const stem = word.slice(0, -ending.length);
      if (stem.length >= 3) { // Kun accepter stammer med mindst 3 bogstaver
        stems.push(stem);
      }
    }
  }
  
  return stems;
};

export const validateDanishWord = async (word: string): Promise<boolean> => {
  const trimmedWord = word.toLowerCase().trim();
  
  // Først tjek om ordet findes direkte
  const { data: directMatch } = await supabase
    .from('danish_words')
    .select('id')
    .eq('word', trimmedWord)
    .maybeSingle();
    
  if (directMatch) {
    console.log(`Direct match found for: ${trimmedWord}`);
    return true;
  }
  
  // Hvis ikke, prøv at finde stammer
  const stems = findWordStem(trimmedWord);
  console.log(`Checking stems for "${trimmedWord}":`, stems);
  
  for (const stem of stems) {
    if (stem === trimmedWord) continue; // Skip det originale ord
    
    const { data: stemMatch } = await supabase
      .from('danish_words')
      .select('id')
      .eq('word', stem)
      .maybeSingle();
      
    if (stemMatch) {
      console.log(`Stem match found: "${trimmedWord}" -> "${stem}"`);
      return true;
    }
  }
  
  console.log(`No valid word or stem found for: ${trimmedWord}`);
  return false;
};
