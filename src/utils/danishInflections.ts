
import { supabase } from '@/integrations/supabase/client';

// Forbedrede danske bøjningsendelser med mere præcise mønstre
const DANISH_ENDINGS = [
  // Substantiver - pluralis og bestemt form (sorteret efter længde for bedre matching)
  { ending: 'ernes', minStem: 3, variants: ['e', ''] }, // skolernes -> skole/skol
  { ending: 'erne', minStem: 3, variants: ['e', ''] },  // skolerne -> skole/skol
  { ending: 'enes', minStem: 3, variants: ['e', ''] },  // hundenes -> hunde/hund
  { ending: 'ene', minStem: 3, variants: ['e', ''] },   // hundene -> hunde/hund
  { ending: 'nes', minStem: 3, variants: ['', 'e'] },   // arbejdernes -> arbejder/arbejdere
  { ending: 'ets', minStem: 3, variants: ['', 'e'] },   // husets -> hus/huse
  { ending: 'ens', minStem: 3, variants: ['', 'e'] },   // kattens -> kat/kate
  { ending: 'ers', minStem: 3, variants: ['e', ''] },   // skolers -> skole/skol
  { ending: 'ede', minStem: 3, variants: [''] },        // arbejdede -> arbejd
  { ending: 'ere', minStem: 3, variants: [''] },        // større -> stor
  { ending: 'est', minStem: 3, variants: [''] },        // størst -> stor
  { ending: 'ne', minStem: 3, variants: [''] },         // bilerne -> biler (efter -er)
  { ending: 'en', minStem: 3, variants: ['', 'e'] },    // katten -> kat/kate
  { ending: 'et', minStem: 3, variants: ['', 'e'] },    // huset -> hus/huse
  { ending: 'es', minStem: 3, variants: ['e', ''] },    // drages -> drage/drag
  { ending: 'er', minStem: 2, variants: ['e', ''] },    // dyner -> dyne, skoler -> skole
  { ending: 'de', minStem: 3, variants: [''] },         // byggede -> bygg
  { ending: 'te', minStem: 3, variants: [''] },         // lavede -> lav
  { ending: 'se', minStem: 3, variants: [''] },         // rejse -> rejs
  { ending: 'e', minStem: 2, variants: [''] },          // skole -> skol
  { ending: 's', minStem: 3, variants: [''] },          // hus -> hu (genitiv)
];

// Specielle regler for danske ord
const SPECIAL_PATTERNS = [
  // Dobbelt-e fjernelse
  { pattern: /ee$/, alternatives: (word: string) => [word.slice(0, -1)] },
  // Dobbeltkonsonanter (f.eks. "trapper" -> "trappe")
  { pattern: /([bcdfghjklmnpqrstvwxz])\1er$/, alternatives: (word: string) => [word.slice(0, -2) + 'e'] },
  { pattern: /([bcdfghjklmnpqrstvwxz])\1$/, alternatives: (word: string) => [word.slice(0, -1)] },
  // Almindelige vokalskift
  { pattern: /å$/, alternatives: (word: string) => [word.slice(0, -1) + 'a'] },
  { pattern: /ø$/, alternatives: (word: string) => [word.slice(0, -1) + 'o'] },
  // Speciel regel for "dyner" -> "dyne" type ord
  { pattern: /([aeiouæøå])([bcdfghjklmnpqrstvwxz])er$/, alternatives: (word: string) => [word.slice(0, -2) + 'e'] },
];

export const findWordStem = (word: string): string[] => {
  const stems = [word]; // Start med det originale ord
  const lowerWord = word.toLowerCase();
  
  console.log(`Finding stems for: "${lowerWord}"`);
  
  // Prøv almindelige danske endelser
  for (const { ending, minStem, variants } of DANISH_ENDINGS) {
    if (lowerWord.length > ending.length + minStem && lowerWord.endsWith(ending)) {
      const baseStem = lowerWord.slice(0, -ending.length);
      if (baseStem.length >= minStem) {
        // Tilføj base stem
        stems.push(baseStem);
        
        // Tilføj varianter
        for (const variant of variants) {
          const stemWithVariant = baseStem + variant;
          if (stemWithVariant.length >= 2 && stemWithVariant !== lowerWord) {
            stems.push(stemWithVariant);
          }
        }
        
        console.log(`Found stems from ending "${ending}": ${baseStem}, variants: ${variants.map(v => baseStem + v).join(', ')}`);
      }
    }
  }
  
  // Anvend specielle mønstre
  for (const { pattern, alternatives } of SPECIAL_PATTERNS) {
    if (pattern.test(lowerWord)) {
      const alts = alternatives(lowerWord);
      stems.push(...alts.filter(alt => alt.length >= 2));
      console.log(`Special pattern matched: ${pattern}, alternatives: ${alts.join(', ')}`);
    }
  }
  
  // Fjern dubletter og sorter efter længde (længste først)
  const uniqueStems = [...new Set(stems)].sort((a, b) => b.length - a.length);
  console.log(`Final stems for "${lowerWord}":`, uniqueStems);
  
  return uniqueStems;
};

export const validateDanishWord = async (word: string): Promise<boolean> => {
  const trimmedWord = word.toLowerCase().trim();
  
  console.log(`Validating Danish word: "${trimmedWord}"`);
  
  // Først tjek om ordet findes direkte
  const { data: directMatch } = await supabase
    .from('danish_words')
    .select('id')
    .eq('word', trimmedWord)
    .maybeSingle();
    
  if (directMatch) {
    console.log(`✓ Direct match found for: ${trimmedWord}`);
    return true;
  }
  
  // Hvis ikke, prøv at finde stammer
  const stems = findWordStem(trimmedWord);
  
  for (const stem of stems) {
    if (stem === trimmedWord) continue; // Skip det originale ord
    
    const { data: stemMatch } = await supabase
      .from('danish_words')
      .select('id')
      .eq('word', stem)
      .maybeSingle();
      
    if (stemMatch) {
      console.log(`✓ Stem match found: "${trimmedWord}" -> "${stem}"`);
      return true;
    }
  }
  
  console.log(`✗ No valid word or stem found for: ${trimmedWord}`);
  return false;
};
