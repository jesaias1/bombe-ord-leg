
import { supabase } from '@/integrations/supabase/client';

// Udvidede danske bøjningsendelser med flere mønstre
const DANISH_ENDINGS = [
  // Substantiver - pluralis og bestemt form
  { ending: 'erne', minStem: 3 }, // skolerne -> skole
  { ending: 'ene', minStem: 3 },  // hundene -> hund
  { ending: 'ne', minStem: 3 },   // bilerne -> bil (efter -er)
  { ending: 'en', minStem: 3 },   // katten -> kat
  { ending: 'et', minStem: 3 },   // huset -> hus
  { ending: 'ets', minStem: 3 },  // husets -> hus
  { ending: 'ens', minStem: 3 },  // kattens -> kat
  { ending: 'es', minStem: 3 },   // drages -> drage
  { ending: 'er', minStem: 3 },   // skoler -> skole
  { ending: 'e', minStem: 3 },    // skole -> skol (men også skole er et ord)
  
  // Verber - forskellige tider og former
  { ending: 'erede', minStem: 3 }, // arbejderede -> arbejd
  { ending: 'ede', minStem: 3 },   // arbejdede -> arbejd
  { ending: 'ende', minStem: 3 },  // arbejdende -> arbejd
  { ending: 'erer', minStem: 3 },  // arbejderer -> arbejd
  { ending: 'ede', minStem: 3 },   // spiste -> spis
  { ending: 'te', minStem: 3 },    // lavede -> lav
  { ending: 'de', minStem: 3 },    // byggede -> bygg
  { ending: 'et', minStem: 3 },    // arbejdet -> arbejd
  { ending: 'es', minStem: 3 },    // arbejdes -> arbejd
  
  // Adjektiver
  { ending: 'ere', minStem: 3 },   // større -> stor
  { ending: 'este', minStem: 3 },  // største -> stor
  { ending: 'ede', minStem: 3 },   // koldede -> kold (gammeldags)
  
  // Sammensatte og andre former
  { ending: 'nes', minStem: 3 },   // arbejdernes -> arbejder
  { ending: 'rets', minStem: 3 },  // arbejdets -> arbejd
  { ending: 'heds', minStem: 3 },  // sandheds -> sandhed
  { ending: 'doms', minStem: 3 },  // kongedoms -> kongedome
  { ending: 'skab', minStem: 3 },  // venskab -> ven
  { ending: 'hed', minStem: 3 },   // sandhed -> sand
];

// Specielle regler for danske ord
const SPECIAL_PATTERNS = [
  // e-endelser hvor vi både tjekker med og uden e
  { pattern: /e$/, alternatives: (word: string) => [word, word.slice(0, -1)] },
  // Dobbeltkonsonanter
  { pattern: /([bcdfghjklmnpqrstvwxz])\1$/, alternatives: (word: string) => [word.slice(0, -1)] },
  // Vokalskift i nogle ord (ikke implementeret endnu)
];

export const findWordStem = (word: string): string[] => {
  const stems = [word]; // Start med det originale ord
  const lowerWord = word.toLowerCase();
  
  // Prøv almindelige danske endelser
  for (const { ending, minStem } of DANISH_ENDINGS) {
    if (lowerWord.length > ending.length + minStem && lowerWord.endsWith(ending)) {
      const stem = lowerWord.slice(0, -ending.length);
      if (stem.length >= minStem) {
        stems.push(stem);
        
        // For e-endelser, prøv også at tilføje e tilbage
        if (ending === 'er' || ending === 'erne') {
          stems.push(stem + 'e'); // skoler -> skole, skolerne -> skole
        }
        
        // For ne-endelser efter r
        if (ending === 'ne' && stem.endsWith('r')) {
          stems.push(stem + 'e'); // bilerne -> biler -> bile (ikke relevant her)
        }
      }
    }
  }
  
  // Anvend specielle mønstre
  for (const { pattern, alternatives } of SPECIAL_PATTERNS) {
    if (pattern.test(lowerWord)) {
      const alts = alternatives(lowerWord);
      stems.push(...alts);
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
