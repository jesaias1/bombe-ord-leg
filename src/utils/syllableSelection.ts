import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
let lastSyllableLength: number | null = null;
let consecutiveSameLength = 0; // Track consecutive syllables of same length
const MAX_RECENT = 20; // Remember more syllables for better variety
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

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  console.log('Last syllable length:', lastSyllableLength);
  console.log('Consecutive same length:', consecutiveSameLength);
  
  const preferredLength = getPreferredLength();
  console.log('Preferred length:', preferredLength);
  
  try {
    // Get more syllables for better filtering and variation
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 3)
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 3)
      .order('word_count', { ascending: false })
      .limit(3000); // Get even more options for better variation

    if (data && data.length > 0) {
      console.log(`Found ${data.length} syllables from database`);
      
      // Enhanced filtering for better quality and variation
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Exclude difficult consonant clusters
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st', 'sk', 'sp', 'sl', 'sm', 'sn', 'tw', 'dw'].includes(syllable) &&
          // Exclude pure consonant clusters
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
          // Avoid recently used syllables more strictly
          !isRecentlyUsed(syllable) &&
          // Ensure it's not just repeated letters
          !(syllable.length === 2 && syllable[0] === syllable[1]) &&
          // Exclude very common but boring syllables unless they have high word counts
          (!['er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne', 'me', 'pe', 'be', 'ge'].includes(syllable) || s.word_count > 15) &&
          // Exclude single letter repeated
          !(syllable.length === 3 && syllable[0] === syllable[1] && syllable[1] === syllable[2])
        );
      });

      console.log(`Filtered to ${validSyllables.length} valid syllables`);

      // Strongly prefer syllables of the preferred length
      let preferredSyllables = validSyllables.filter(s => s.syllable.length === preferredLength);
      console.log(`Found ${preferredSyllables.length} syllables of preferred length ${preferredLength}`);
      
      // Use preferred length if we have good options
      let syllablesToChooseFrom = preferredSyllables.length >= 8 ? preferredSyllables : validSyllables;
      
      // If forcing length change due to consecutive same length, be more strict
      if (consecutiveSameLength >= MAX_CONSECUTIVE_SAME_LENGTH && preferredSyllables.length >= 3) {
        syllablesToChooseFrom = preferredSyllables;
        console.log(`Forcing length change to ${preferredLength} due to consecutive same length`);
      }
      
      // If we still don't have enough variety, be less strict about recently used
      if (syllablesToChooseFrom.length < 8 && recentlyUsed.length > 5) {
        console.log('Not enough syllables, being less strict about recently used');
        const recentToAvoid = recentlyUsed.slice(-8); // Only avoid last 8
        syllablesToChooseFrom = data.filter(s => {
          const syllable = s.syllable.toLowerCase();
          return (
            syllable.length >= 2 && 
            syllable.length <= 3 &&
            /[aeiouyæøå]/.test(syllable) &&
            !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st', 'sk', 'sp', 'sl', 'sm', 'sn'].includes(syllable) &&
            !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
            !recentToAvoid.includes(syllable) &&
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
        // Enhanced weighted selection with stronger bias toward preferred length and variety
        const weights = syllablesToChooseFrom.map((s, i) => {
          let weight = Math.max(1, s.word_count - i * 0.03);
          
          // Strong boost for preferred length
          if (s.syllable.length === preferredLength) {
            weight *= 3;
          }
          
          // Extra boost for 3-letter syllables as they're often more interesting
          if (s.syllable.length === 3) {
            weight *= 1.5;
          }
          
          // Boost less common syllables for variety
          if (s.word_count < 50 && s.word_count > 10) {
            weight *= 1.2;
          }
          
          return weight;
        });
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const randomWeight = Math.random() * totalWeight;
        
        let currentWeight = 0;
        for (let i = 0; i < syllablesToChooseFrom.length; i++) {
          currentWeight += weights[i];
          if (randomWeight <= currentWeight) {
            const selectedSyllable = syllablesToChooseFrom[i].syllable;
            console.log(`Selected syllable from database: "${selectedSyllable}" (length: ${selectedSyllable.length}, word_count: ${syllablesToChooseFrom[i].word_count})`);
            addToRecentlyUsed(selectedSyllable);
            return selectedSyllable;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Enhanced fallback with better variety
  console.log('Using enhanced fallback syllables');
  const fallbackSyllables = {
    'let': [
      'ba', 'bi', 'bo', 'bu', 'da', 'di', 'do', 'fa', 'fi', 'fo', 'ga', 'gi', 'go', 'ha', 'hi', 'ho', 'ka', 'ki', 'ko',
      'la', 'li', 'lo', 'ma', 'mi', 'mo', 'na', 'ni', 'no', 'pa', 'pi', 'po', 'ra', 'ri', 'ro', 'sa', 'si', 'so',
      'ta', 'ti', 'to', 'va', 'vi', 'vo', 'za', 'zi', 'zo', 'ya', 'yi', 'yo', 'æa', 'øa', 'åa',
      'bil', 'dal', 'fal', 'gal', 'hal', 'kal', 'mal', 'pal', 'sal', 'tal', 'val', 'jul', 'mul', 'pul', 'sul',
      'bre', 'dre', 'fre', 'gre', 'kre', 'pre', 'tre', 'bla', 'fla', 'gla', 'kla', 'pla'
    ],
    'mellem': [
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver', 'ær', 'ør', 'år',
      'bil', 'fil', 'mil', 'sil', 'til', 'vil', 'øl', 'ål', 'æl',
      'bor', 'dor', 'for', 'kor', 'mor', 'por', 'sor', 'tor', 'vor', 'rør', 'hør',
      'bro', 'dro', 'fro', 'gro', 'kro', 'pro', 'tro', 'grø', 'frø', 'strø',
      'ble', 'fle', 'gle', 'kle', 'ple', 'tle', 'grå', 'blå', 'små',
      'bra', 'dra', 'fra', 'gra', 'kra', 'pra', 'tra', 'spa', 'sta', 'ska'
    ],
    'svaer': [
      'tion', 'sion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting', 'wing', 'ping',
      'ende', 'ande', 'inde', 'unde', 'orde', 'erde', 'agne', 'egne', 'igne', 'ogne',
      'else', 'anse', 'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste', 'yste',
      'bel', 'del', 'fel', 'gel', 'hel', 'kel', 'mel', 'pel', 'sel', 'tel', 'vel', 'øl', 'ål'
    ]
  };
  
  const allSyllables = [...fallbackSyllables[difficulty]];
  
  // Filter for variety and preferred length
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  let preferredLengthSyllables = availableSyllables.filter(s => s.length === preferredLength);
  
  // Use preferred length if available, otherwise any available
  let finalSyllables = preferredLengthSyllables.length >= 5 ? preferredLengthSyllables : availableSyllables;
  
  // If most syllables are recently used, do partial reset
  if (finalSyllables.length < 5) {
    console.log('Most syllables recently used, partial reset...');
    const lastFew = recentlyUsed.slice(-5);
    recentlyUsed = lastFew;
    finalSyllables = allSyllables.filter(s => !lastFew.includes(s));
    
    preferredLengthSyllables = finalSyllables.filter(s => s.length === preferredLength);
    finalSyllables = preferredLengthSyllables.length >= 5 ? preferredLengthSyllables : finalSyllables;
  }
  
  // Better randomization
  for (let i = finalSyllables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalSyllables[i], finalSyllables[j]] = [finalSyllables[j], finalSyllables[i]];
  }
  
  const selectedSyllable = finalSyllables[0];
  console.log(`Selected fallback syllable: "${selectedSyllable}" (length: ${selectedSyllable.length})`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
