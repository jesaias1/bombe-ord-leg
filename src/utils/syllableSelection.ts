
import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
let lastSyllableLength: number | null = null;
let consecutiveSameLength = 0; // Track consecutive syllables of same length
const MAX_RECENT = 15; // Remember more syllables for better variety
const MAX_CONSECUTIVE_SAME_LENGTH = 2; // Max consecutive syllables of same length

const addToRecentlyUsed = (syllable: string) => {
  recentlyUsed.push(syllable.toLowerCase());
  
  // Track consecutive same length
  if (lastSyllableLength === syllable.length) {
    consecutiveSameLength++;
  } else {
    consecutiveSameLength = 1;
  }
  
  lastSyllableLength = syllable.length;
  
  if (recentlyUsed.length > MAX_RECENT) {
    recentlyUsed.shift();
  }
};

const isRecentlyUsed = (syllable: string) => {
  return recentlyUsed.includes(syllable.toLowerCase());
};

// Force alternating length if we've had too many of the same length
const getPreferredLength = (): number => {
  if (lastSyllableLength === null) {
    return Math.random() < 0.5 ? 2 : 3; // Random start
  }
  
  // If we've had too many consecutive of same length, force opposite
  if (consecutiveSameLength >= MAX_CONSECUTIVE_SAME_LENGTH) {
    return lastSyllableLength === 2 ? 3 : 2;
  }
  
  // Otherwise prefer opposite for natural variation
  const shouldAlternate = Math.random() < 0.7; // 70% chance to alternate
  return shouldAlternate ? (lastSyllableLength === 2 ? 3 : 2) : lastSyllableLength;
};

// Check if syllable has good vowel/consonant balance
const hasGoodVowelBalance = (syllable: string): boolean => {
  const vowels = syllable.match(/[aeiouyæøå]/gi) || [];
  const consonants = syllable.match(/[bcdfghjklmnpqrstvwxz]/gi) || [];
  
  // Should have at least one vowel and not be all consonants
  return vowels.length >= 1 && consonants.length <= syllable.length - 1;
};

// Prioritize syllables with vowels for better gameplay
const getVowelScore = (syllable: string): number => {
  const vowelCount = (syllable.match(/[aeiouyæøå]/gi) || []).length;
  const totalLength = syllable.length;
  
  // Give higher score to syllables with good vowel distribution
  if (vowelCount === 0) return 0; // No vowels = bad
  if (vowelCount === totalLength) return 0.3; // All vowels = rare but ok
  
  // Balanced syllables get highest score
  const vowelRatio = vowelCount / totalLength;
  if (vowelRatio >= 0.3 && vowelRatio <= 0.6) return 1.0; // Good balance
  
  return 0.5; // Acceptable
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  console.log('Last syllable length:', lastSyllableLength);
  console.log('Consecutive same length:', consecutiveSameLength);
  
  const preferredLength = getPreferredLength();
  console.log('Preferred length:', preferredLength);
  
  try {
    // Get a large sample for true randomness
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 2) // Lower threshold for more variety
      .order('word_count', { ascending: false })
      .limit(5000); // Get even more options

    if (data && data.length > 0) {
      console.log(`Found ${data.length} syllables from database`);
      
      // Enhanced filtering focusing on variety and vowel balance
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          // Must have good vowel balance
          hasGoodVowelBalance(syllable) &&
          // Avoid recently used syllables
          !isRecentlyUsed(syllable) &&
          // Exclude pure consonant clusters (these are the problem!)
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
          // Exclude difficult/boring combinations
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st', 'sk', 'sp', 'sl', 'sm', 'sn', 'tw', 'dw', 'sw', 'sc', 'sb', 'sg', 'sf'].includes(syllable) &&
          // Ensure it's not just repeated letters
          !(syllable.length === 2 && syllable[0] === syllable[1]) &&
          // Exclude single letter repeated
          !(syllable.length === 3 && syllable[0] === syllable[1] && syllable[1] === syllable[2])
        );
      });

      console.log(`Filtered to ${validSyllables.length} valid syllables`);

      // Strongly prefer syllables of the preferred length
      let preferredSyllables = validSyllables.filter(s => s.syllable.length === preferredLength);
      console.log(`Found ${preferredSyllables.length} syllables of preferred length ${preferredLength}`);
      
      // Use preferred length if we have good options
      let syllablesToChooseFrom = preferredSyllables.length >= 5 ? preferredSyllables : validSyllables;
      
      // If forcing length change due to consecutive same length, be more strict
      if (consecutiveSameLength >= MAX_CONSECUTIVE_SAME_LENGTH && preferredSyllables.length >= 3) {
        syllablesToChooseFrom = preferredSyllables;
        console.log(`Forcing length change to ${preferredLength} due to consecutive same length`);
      }
      
      // If we still don't have enough variety, be less strict about recently used
      if (syllablesToChooseFrom.length < 5 && recentlyUsed.length > 3) {
        console.log('Not enough syllables, being less strict about recently used');
        const recentToAvoid = recentlyUsed.slice(-5); // Only avoid last 5
        syllablesToChooseFrom = data.filter(s => {
          const syllable = s.syllable.toLowerCase();
          return (
            syllable.length >= 2 && 
            syllable.length <= 3 &&
            hasGoodVowelBalance(syllable) &&
            !recentToAvoid.includes(syllable) &&
            !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
            !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st', 'sk', 'sp', 'sl', 'sm', 'sn'].includes(syllable) &&
            !(syllable.length === 2 && syllable[0] === syllable[1])
          );
        });
        
        // Again prefer the target length
        const lessStrictPreferred = syllablesToChooseFrom.filter(s => s.syllable.length === preferredLength);
        if (lessStrictPreferred.length >= 3) {
          syllablesToChooseFrom = lessStrictPreferred;
        }
      }

      if (syllablesToChooseFrom.length > 0) {
        // PRIORITIZE RANDOMNESS over frequency for better gameplay
        const syllablesWithScores = syllablesToChooseFrom.map(s => ({
          ...s,
          vowelScore: getVowelScore(s.syllable),
          randomScore: Math.random() // Pure randomness factor
        }));

        // Sort by vowel score and randomness rather than word count
        syllablesWithScores.sort((a, b) => {
          // First prioritize vowel balance
          const vowelDiff = b.vowelScore - a.vowelScore;
          if (Math.abs(vowelDiff) > 0.1) return vowelDiff;
          
          // Then use pure randomness
          return b.randomScore - a.randomScore;
        });

        // Select from top candidates with some randomness
        const topCandidates = syllablesWithScores.slice(0, Math.min(20, syllablesWithScores.length));
        const selectedIndex = Math.floor(Math.random() * topCandidates.length);
        const selectedSyllable = topCandidates[selectedIndex].syllable;
        
        console.log(`Selected syllable from database: "${selectedSyllable}" (length: ${selectedSyllable.length}, word_count: ${topCandidates[selectedIndex].word_count}, vowel_score: ${topCandidates[selectedIndex].vowelScore})`);
        addToRecentlyUsed(selectedSyllable);
        return selectedSyllable;
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Enhanced fallback with better vowel distribution
  console.log('Using enhanced fallback syllables with better vowel balance');
  const fallbackSyllables = {
    'let': [
      // More vowel-heavy syllables
      'ba', 'be', 'bi', 'bo', 'bu', 'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu',
      'ga', 'ge', 'gi', 'go', 'gu', 'ha', 'he', 'hi', 'ho', 'hu', 'ja', 'je', 'ji', 'jo', 'ju',
      'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 'mo', 'mu',
      'na', 'ne', 'ni', 'no', 'nu', 'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 'ri', 'ro', 'ru',
      'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'va', 've', 'vi', 'vo', 'vu',
      'ya', 'ye', 'yi', 'yo', 'yu', 'za', 'ze', 'zi', 'zo', 'zu', 'æa', 'æe', 'øa', 'øe', 'åa', 'åe',
      // Some 3-letter with good vowel balance
      'ale', 'ane', 'are', 'ave', 'ide', 'ode', 'ude', 'ige', 'age', 'eje', 'aye', 'oye'
    ],
    'mellem': [
      // Balanced vowel/consonant combinations
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver',
      'bel', 'del', 'fel', 'gel', 'hel', 'kel', 'mel', 'pel', 'sel', 'tel', 'vel',
      'bil', 'dil', 'fil', 'gil', 'hil', 'kil', 'mil', 'pil', 'sil', 'til', 'vil',
      'bol', 'dol', 'fol', 'gol', 'hol', 'kol', 'mol', 'pol', 'sol', 'tol', 'vol',
      'bul', 'dul', 'ful', 'gul', 'hul', 'kul', 'mul', 'pul', 'sul', 'tul', 'vul',
      'bra', 'dra', 'fra', 'gra', 'kra', 'pra', 'tra', 'bla', 'fla', 'gla', 'kla', 'pla',
      'bre', 'dre', 'fre', 'gre', 'kre', 'pre', 'tre', 'ble', 'fle', 'gle', 'kle', 'ple',
      'bro', 'dro', 'fro', 'gro', 'kro', 'pro', 'tro', 'blo', 'flo', 'glo', 'klo', 'plo',
      'bru', 'dru', 'fru', 'gru', 'kru', 'pru', 'tru', 'blu', 'flu', 'glu', 'klu', 'plu'
    ],
    'svaer': [
      // Complex but still with vowel balance
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver',
      'ban', 'dan', 'fan', 'gan', 'han', 'kan', 'lan', 'man', 'pan', 'ran', 'san', 'tan', 'van',
      'ben', 'den', 'fen', 'gen', 'hen', 'ken', 'len', 'men', 'pen', 'ren', 'sen', 'ten', 'ven',
      'bin', 'din', 'fin', 'gin', 'hin', 'kin', 'lin', 'min', 'pin', 'rin', 'sin', 'tin', 'vin',
      'bon', 'don', 'fon', 'gon', 'hon', 'kon', 'lon', 'mon', 'pon', 'ron', 'son', 'ton', 'von',
      'bun', 'dun', 'fun', 'gun', 'hun', 'kun', 'lun', 'mun', 'pun', 'run', 'sun', 'tun', 'vun'
    ]
  };
  
  const allSyllables = [...fallbackSyllables[difficulty]];
  
  // Filter for variety and preferred length
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s) && hasGoodVowelBalance(s));
  let preferredLengthSyllables = availableSyllables.filter(s => s.length === preferredLength);
  
  // Use preferred length if available, otherwise any available
  let finalSyllables = preferredLengthSyllables.length >= 3 ? preferredLengthSyllables : availableSyllables;
  
  // If most syllables are recently used, do partial reset
  if (finalSyllables.length < 3) {
    console.log('Most syllables recently used, partial reset...');
    const lastFew = recentlyUsed.slice(-3);
    recentlyUsed = lastFew;
    finalSyllables = allSyllables.filter(s => !lastFew.includes(s) && hasGoodVowelBalance(s));
    
    preferredLengthSyllables = finalSyllables.filter(s => s.length === preferredLength);
    finalSyllables = preferredLengthSyllables.length >= 3 ? preferredLengthSyllables : finalSyllables;
  }
  
  // Pure randomization for fallback
  const randomIndex = Math.floor(Math.random() * finalSyllables.length);
  const selectedSyllable = finalSyllables[randomIndex];
  
  console.log(`Selected fallback syllable: "${selectedSyllable}" (length: ${selectedSyllable.length})`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
