
import { supabase } from '@/integrations/supabase/client';

// Udvidede danske bøjningsendelser med flere mønstre
const DANISH_ENDINGS = [
  // Substantiver - pluralis og bestemt form (sorteret efter længde for bedre matching)
  { ending: 'ernes', minStem: 3 }, // skolernes -> skole
  { ending: 'erne', minStem: 3 },  // skolerne -> skole
  { ending: 'enes', minStem: 3 },  // hundenes -> hund
  { ending: 'ene', minStem: 3 },   // hundene -> hund
  { ending: 'nes', minStem: 3 },   // arbejdernes -> arbejder
  { ending: 'ets', minStem: 3 },   // husets -> hus
  { ending: 'ens', minStem: 3 },   // kattens -> kat
  { ending: 'ers', minStem: 3 },   // skolers -> skole
  { ending: 'ede', minStem: 3 },   // arbejdede -> arbejd
  { ending: 'ere', minStem: 3 },   // større -> stor
  { ending: 'est', minStem: 3 },   // størst -> stor
  { ending: 'ne', minStem: 3 },    // bilerne -> bil (efter -er)
  { ending: 'en', minStem: 3 },    // katten -> kat
  { ending: 'et', minStem: 3 },    // huset -> hus
  { ending: 'es', minStem: 3 },    // drages -> drage
  { ending: 'er', minStem: 3 },    // skoler -> skole
  { ending: 'de', minStem: 3 },    // byggede -> bygg
  { ending: 'te', minStem: 3 },    // lavede -> lav
  { ending: 'se', minStem: 3 },    // rejse -> rejs
  { ending: 'e', minStem: 2 },     // skole -> skol (men også skole er et ord)
  { ending: 's', minStem: 3 },     // hus -> hu (genitiv)
];

// Specielle regler for danske ord
const SPECIAL_PATTERNS = [
  // Dobbelt-e fjernelse
  { pattern: /ee$/, alternatives: (word: string) => [word.slice(0, -1)] },
  // Dobbeltkonsonanter
  { pattern: /([bcdfghjklmnpqrstvwxz])\1$/, alternatives: (word: string) => [word.slice(0, -1)] },
  // Almindelige vokalskift
  { pattern: /å$/, alternatives: (word: string) => [word.slice(0, -1) + 'a'] },
  { pattern: /ø$/, alternatives: (word: string) => [word.slice(0, -1) + 'o'] },
];

export const findWordStem = (word: string): string[] => {
  const stems = [word]; // Start med det originale ord
  const lowerWord = word.toLowerCase();
  
  // Prøv almindelige danske endelser (sorteret efter længde for bedre matching)
  for (const { ending, minStem } of DANISH_ENDINGS) {
    if (lowerWord.length > ending.length + minStem && lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -ending.length);
      if (stem.length >= minStem) {
        stems.push(stem);
        
        // Specielle regler for e-endelser
        if (ending === 'e' && stem.length >= 3) {
          // Prøv både med og uden e
          stems.push(stem + 'e');
        }
        
        // For pluralis endelser, prøv at tilføje e tilbage
        if (['er', 'erne', 'ernes'].includes(ending)) {
          if (!stem.endsWith('e')) {
            stems.push(stem + 'e'); // skoler -> skole, skolerne -> skole
          }
        }
        
        // For bestemt form, prøv forskellige varianter
        if (['en', 'et', 'ene', 'erne'].includes(ending)) {
          // Prøv grundform med e
          if (!stem.endsWith('e') && stem.length >= 3) {
            stems.push(stem + 'e');
          }
        }
      }
    }
  }
  
  // Anvend specielle mønstre
  for (const { pattern, alternatives } of SPECIAL_PATTERNS) {
    if (pattern.test(lowerWord)) {
      const alts = alternatives(lowerWord);
      stems.push(...alts.filter(alt => alt.length >= 2));
    }
  }
  
  // Fjern dubletter og sorter efter længde (længste først)
  return [...new Set(stems)].sort((a, b) => b.length - a.length);
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
