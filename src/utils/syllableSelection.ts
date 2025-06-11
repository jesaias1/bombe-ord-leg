import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
const MAX_RECENT = 8; // Reduced to allow more variety

const addToRecentlyUsed = (syllable: string) => {
  recentlyUsed.push(syllable.toLowerCase());
  if (recentlyUsed.length > MAX_RECENT) {
    recentlyUsed.shift();
  }
};

const isRecentlyUsed = (syllable: string) => {
  return recentlyUsed.includes(syllable.toLowerCase());
};

// Basic check - just ensure it has at least one vowel
const hasVowel = (syllable: string): boolean => {
  return /[aeiouyæøå]/i.test(syllable);
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  
  try {
    // Get ALL syllables for maximum randomness
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', difficulty)
      .gte('word_count', 1); // Very low threshold

    if (data && data.length > 0) {
      console.log(`Found ${data.length} syllables from database`);
      
      // MINIMAL filtering - just basic sanity checks
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          // Must have at least one vowel
          hasVowel(syllable) &&
          // Not recently used
          !isRecentlyUsed(syllable) &&
          // Not pure consonants
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable)
        );
      });

      console.log(`Filtered to ${validSyllables.length} valid syllables`);

      // If we have valid syllables, pick COMPLETELY RANDOMLY
      if (validSyllables.length > 0) {
        // Pure random selection - no sorting, no scoring, no preferences
        const randomIndex = Math.floor(Math.random() * validSyllables.length);
        const selectedSyllable = validSyllables[randomIndex].syllable;
        
        console.log(`Selected random syllable: "${selectedSyllable}"`);
        addToRecentlyUsed(selectedSyllable);
        return selectedSyllable;
      }

      // If no valid syllables after filtering, be less strict
      console.log('Being less strict about recently used...');
      const lessStrictSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          hasVowel(syllable) &&
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable)
        );
      });

      if (lessStrictSyllables.length > 0) {
        const randomIndex = Math.floor(Math.random() * lessStrictSyllables.length);
        const selectedSyllable = lessStrictSyllables[randomIndex].syllable;
        
        console.log(`Selected less strict syllable: "${selectedSyllable}"`);
        addToRecentlyUsed(selectedSyllable);
        return selectedSyllable;
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback with much more variety
  console.log('Using fallback syllables with maximum variety');
  const fallbackSyllables = {
    'let': [
      // Many vowel-heavy options
      'ba', 'be', 'bi', 'bo', 'bu', 'da', 'de', 'di', 'do', 'du', 
      'fa', 'fe', 'fi', 'fo', 'fu', 'ga', 'ge', 'gi', 'go', 'gu',
      'ha', 'he', 'hi', 'ho', 'hu', 'ja', 'je', 'ji', 'jo', 'ju',
      'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu',
      'ma', 'me', 'mi', 'mo', 'mu', 'na', 'ne', 'ni', 'no', 'nu',
      'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 'ri', 'ro', 'ru',
      'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu',
      'va', 've', 'vi', 'vo', 'vu', 'ya', 'ye', 'yi', 'yo', 'yu',
      'za', 'ze', 'zi', 'zo', 'zu', 'æa', 'æe', 'øa', 'øe', 'åa', 'åe',
      'ale', 'ane', 'are', 'ave', 'ide', 'ode', 'ude', 'ege', 'age', 'eje'
    ],
    'mellem': [
      // Balanced combinations with lots of variety
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver',
      'bel', 'del', 'fel', 'gel', 'hel', 'kel', 'mel', 'pel', 'sel', 'tel', 'vel',
      'bil', 'dil', 'fil', 'gil', 'hil', 'kil', 'mil', 'pil', 'sil', 'til', 'vil',
      'bol', 'dol', 'fol', 'gol', 'hol', 'kol', 'mol', 'pol', 'sol', 'tol', 'vol',
      'ban', 'dan', 'fan', 'gan', 'han', 'kan', 'lan', 'man', 'pan', 'ran', 'san', 'tan', 'van',
      'ben', 'den', 'fen', 'gen', 'hen', 'ken', 'len', 'men', 'pen', 'ren', 'sen', 'ten', 'ven',
      'bin', 'din', 'fin', 'gin', 'hin', 'kin', 'lin', 'min', 'pin', 'rin', 'sin', 'tin', 'vin',
      'bon', 'don', 'fon', 'gon', 'hon', 'kon', 'lon', 'mon', 'pon', 'ron', 'son', 'ton', 'von',
      'bra', 'dra', 'fra', 'gra', 'kra', 'pra', 'tra', 'bla', 'fla', 'gla', 'kla', 'pla',
      'bre', 'dre', 'fre', 'gre', 'kre', 'pre', 'tre', 'ble', 'fle', 'gle', 'kle', 'ple',
      'bro', 'dro', 'fro', 'gro', 'kro', 'pro', 'tro', 'blo', 'flo', 'glo', 'klo', 'plo',
      'bru', 'dru', 'fru', 'gru', 'kru', 'pru', 'tru', 'blu', 'flu', 'glu', 'klu', 'plu',
      'lad', 'mad', 'rad', 'sad', 'tad', 'vad', 'led', 'med', 'red', 'sed', 'ted', 'ved',
      'lid', 'mid', 'rid', 'sid', 'tid', 'vid', 'lod', 'mod', 'rod', 'sod', 'tod', 'vod'
    ],
    'svaer': [
      // Complex but varied
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver',
      'ban', 'dan', 'fan', 'gan', 'han', 'kan', 'lan', 'man', 'pan', 'ran', 'san', 'tan', 'van',
      'ben', 'den', 'fen', 'gen', 'hen', 'ken', 'len', 'men', 'pen', 'ren', 'sen', 'ten', 'ven',
      'bin', 'din', 'fin', 'gin', 'hin', 'kin', 'lin', 'min', 'pin', 'rin', 'sin', 'tin', 'vin',
      'bon', 'don', 'fon', 'gon', 'hon', 'kon', 'lon', 'mon', 'pon', 'ron', 'son', 'ton', 'von',
      'bun', 'dun', 'fun', 'gun', 'hun', 'kun', 'lun', 'mun', 'pun', 'run', 'sun', 'tun', 'vun',
      'lag', 'mag', 'rag', 'sag', 'tag', 'vag', 'leg', 'meg', 'reg', 'seg', 'teg', 'veg',
      'lig', 'mig', 'rig', 'sig', 'tig', 'vig', 'log', 'mog', 'rog', 'sog', 'tog', 'vog',
      'lug', 'mug', 'rug', 'sug', 'tug', 'vug', 'lek', 'mek', 'rek', 'sek', 'tek', 'vek'
    ]
  };
  
  const allSyllables = [...fallbackSyllables[difficulty]];
  
  // Filter out recently used, but if too few remain, reset
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  
  if (availableSyllables.length < 5) {
    console.log('Resetting recently used for more variety...');
    recentlyUsed = [];
    availableSyllables = allSyllables;
  }
  
  // Pure random selection
  const randomIndex = Math.floor(Math.random() * availableSyllables.length);
  const selectedSyllable = availableSyllables[randomIndex];
  
  console.log(`Selected fallback syllable: "${selectedSyllable}"`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
