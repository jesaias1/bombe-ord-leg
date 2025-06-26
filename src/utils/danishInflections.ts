
import { supabase } from '@/integrations/supabase/client';

// Udvidede danske bøjningsendelser med fokus på adjektiver og bedre stemme-genkendelse
const DANISH_ENDINGS = [
  // Adjektiver - komparativ og superlativ (højeste prioritet)
  { ending: 'este', minStem: 3, variants: [''], priority: 10 }, // smukkeste -> smuk
  { ending: 'ere', minStem: 3, variants: [''], priority: 9 },  // smukkere -> smuk
  { ending: 'est', minStem: 3, variants: [''], priority: 8 },  // størst -> stor
  
  // Substantiver - pluralis og bestemt form
  { ending: 'ernes', minStem: 3, variants: ['e', ''], priority: 7 }, // skolernes -> skole/skol
  { ending: 'erne', minStem: 3, variants: ['e', ''], priority: 7 },  // skolerne -> skole/skol
  { ending: 'enes', minStem: 3, variants: ['e', ''], priority: 6 },  // hundenes -> hunde/hund
  { ending: 'ene', minStem: 3, variants: ['e', ''], priority: 6 },   // hundene -> hunde/hund
  { ending: 'nes', minStem: 3, variants: ['', 'e'], priority: 5 },   // arbejdernes -> arbejder/arbejdere
  { ending: 'ets', minStem: 3, variants: ['', 'e'], priority: 5 },   // husets -> hus/huse
  { ending: 'ens', minStem: 3, variants: ['', 'e'], priority: 5 },   // kattens -> kat/kate
  { ending: 'ers', minStem: 3, variants: ['e', ''], priority: 4 },   // skolers -> skole/skol
  
  // Verber
  { ending: 'ede', minStem: 3, variants: [''], priority: 4 },        // arbejdede -> arbejd
  { ending: 'ende', minStem: 3, variants: [''], priority: 3 },       // arbejdende -> arbejd
  { ending: 'et', minStem: 3, variants: ['', 'e'], priority: 3 },    // huset -> hus/huse, arbejdet -> arbejd
  { ending: 'en', minStem: 3, variants: ['', 'e'], priority: 3 },    // katten -> kat/kate
  
  // Fælles endelser
  { ending: 'ne', minStem: 3, variants: [''], priority: 2 },         // bilerne -> biler
  { ending: 'es', minStem: 3, variants: ['e', ''], priority: 2 },    // drages -> drage/drag
  { ending: 'er', minStem: 2, variants: ['e', ''], priority: 1 },    // dyner -> dyne, skoler -> skole
  { ending: 'de', minStem: 3, variants: [''], priority: 1 },         // byggede -> bygg
  { ending: 'te', minStem: 3, variants: [''], priority: 1 },         // lavede -> lav
  { ending: 'se', minStem: 3, variants: [''], priority: 1 },         // rejse -> rejs
  { ending: 'e', minStem: 2, variants: [''], priority: 0 },          // skole -> skol, smukke -> smuk
  { ending: 's', minStem: 3, variants: [''], priority: 0 },          // hus -> hu (genitiv)
];

// Specielle regler for danske ord med fokus på adjektiver
const SPECIAL_PATTERNS = [
  // Adjektiver med dobbeltkonsonanter før -ere/-est
  { 
    pattern: /([bcdfghjklmnpqrstvwxz])\1ere$/, 
    alternatives: (word: string) => {
      const stem = word.slice(0, -4); // fjern 'ere'
      return [stem, stem + 'e']; // både "smuk" og "smukke"
    }
  },
  { 
    pattern: /([bcdfghjklmnpqrstvwxz])\1este?$/, 
    alternatives: (word: string) => {
      const stem = word.replace(/([bcdfghjklmnpqrstvwxz])\1este?$/, '$1');
      return [stem, stem + 'e']; // både "smuk" og "smukke"
    }
  },
  
  // Almindelige adjektiv-mønstre
  { 
    pattern: /ere$/, 
    alternatives: (word: string) => {
      const stem = word.slice(0, -3);
      return [stem, stem + 'e']; // f.eks. "store" -> "stor", "store"
    }
  },
  
  // Dobbelt-e fjernelse
  { pattern: /ee$/, alternatives: (word: string) => [word.slice(0, -1)] },
  
  // Dobbeltkonsonanter for substantiver
  { pattern: /([bcdfghjklmnpqrstvwxz])\1er$/, alternatives: (word: string) => [word.slice(0, -2) + 'e'] },
  { pattern: /([bcdfghjklmnpqrstvwxz])\1$/, alternatives: (word: string) => [word.slice(0, -1)] },
  
  // Vokalskift
  { pattern: /å$/, alternatives: (word: string) => [word.slice(0, -1) + 'a'] },
  { pattern: /ø$/, alternatives: (word: string) => [word.slice(0, -1) + 'o'] },
  
  // Speciel regel for "dyner" -> "dyne" type ord
  { pattern: /([aeiouæøå])([bcdfghjklmnpqrstvwxz])er$/, alternatives: (word: string) => [word.slice(0, -2) + 'e'] },
];

// Specialtilfælde for almindelige adjektiver
const ADJECTIVE_SPECIAL_CASES: Record<string, string[]> = {
  'smukkere': ['smuk', 'smukke'],
  'smukkeste': ['smuk', 'smukke'],
  'større': ['stor', 'store'],
  'største': ['stor', 'store'],
  'mindre': ['lille', 'små', 'small'],
  'mindste': ['lille', 'små', 'small'],
  'bedre': ['god', 'godt', 'gode'],
  'bedste': ['god', 'godt', 'gode'],
  'værre': ['dårlig', 'dårligt', 'dårlige', 'slem', 'slemt', 'slemme'],
  'værste': ['dårlig', 'dårligt', 'dårlige', 'slem', 'slemt', 'slemme'],
  'ældre': ['gammel', 'gammelt', 'gamle'],
  'ældste': ['gammel', 'gammelt', 'gamle'],
  'yngre': ['ung', 'ungt', 'unge'],
  'yngste': ['ung', 'ungt', 'unge'],
};

export const findWordStem = (word: string): string[] => {
  const stems = [word]; // Start med det originale ord
  const lowerWord = word.toLowerCase();
  
  console.log(`Finding stems for: "${lowerWord}"`);
  
  // Tjek specialtilfælde først
  if (ADJECTIVE_SPECIAL_CASES[lowerWord]) {
    const specialStems = ADJECTIVE_SPECIAL_CASES[lowerWord];
    stems.push(...specialStems);
    console.log(`Found special case stems for "${lowerWord}":`, specialStems);
  }
  
  // Sorter endelser efter prioritet (højeste først)
  const sortedEndings = [...DANISH_ENDINGS].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  // Prøv almindelige danske endelser
  for (const { ending, minStem, variants } of sortedEndings) {
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
        
        // For adjektiver, stop ved første match for at undgå for mange varianter
        if (['ere', 'est', 'este'].some(adj => ending.includes(adj))) {
          break;
        }
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
