import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
let lastSyllableLength: number | null = null;
const MAX_RECENT = 15; // Remember last 15 syllables for better variety

const addToRecentlyUsed = (syllable: string) => {
  recentlyUsed.push(syllable.toLowerCase());
  lastSyllableLength = syllable.length;
  if (recentlyUsed.length > MAX_RECENT) {
    recentlyUsed.shift();
  }
};

const isRecentlyUsed = (syllable: string) => {
  return recentlyUsed.includes(syllable.toLowerCase());
};

// Prefer alternating between 2 and 3 letter syllables
const getPreferredLength = (): number => {
  if (lastSyllableLength === null) {
    return Math.random() < 0.5 ? 2 : 3; // Random start
  }
  // Prefer opposite length for variety
  return lastSyllableLength === 2 ? 3 : 2;
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  console.log('Last syllable length:', lastSyllableLength);
  
  const preferredLength = getPreferredLength();
  console.log('Preferred length:', preferredLength);
  
  try {
    // Try to get syllables from database with better filtering for variation
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 3) // Ensure syllables have enough words
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 3)
      .order('word_count', { ascending: false })
      .limit(2000); // Get more options for better filtering

    if (data && data.length > 0) {
      console.log(`Found ${data.length} syllables from database`);
      
      // Filter syllables for quality and variety
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Exclude problematic single/double consonant combinations
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st', 'sk', 'sp', 'sl', 'sm', 'sn'].includes(syllable) &&
          // Exclude pure consonant clusters
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
          // Avoid recently used syllables
          !isRecentlyUsed(syllable) &&
          // Ensure it's not just repeated letters
          !(syllable.length === 2 && syllable[0] === syllable[1]) &&
          // Exclude very common but boring syllables
          !['er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne'].includes(syllable) ||
          (syllable.length === 3 && s.word_count > 10) // Allow some common ones if they're 3 letters and have many words
        );
      });

      console.log(`Filtered to ${validSyllables.length} valid syllables`);

      // First try to get syllables of preferred length
      let preferredSyllables = validSyllables.filter(s => s.syllable.length === preferredLength);
      console.log(`Found ${preferredSyllables.length} syllables of preferred length ${preferredLength}`);
      
      // If not enough of preferred length, use any valid syllables
      let syllablesToChooseFrom = preferredSyllables.length >= 5 ? preferredSyllables : validSyllables;
      
      // If we still don't have enough options, be less strict about recently used
      if (syllablesToChooseFrom.length < 5 && recentlyUsed.length > 0) {
        console.log('Not enough syllables, being less strict about recently used');
        const recentToAvoid = recentlyUsed.slice(-5); // Only avoid last 5
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
      }

      if (syllablesToChooseFrom.length > 0) {
        // Use weighted random selection favoring higher word counts and preferred length
        const weights = syllablesToChooseFrom.map((s, i) => {
          let weight = Math.max(1, s.word_count - i * 0.05);
          // Boost weight for preferred length
          if (s.syllable.length === preferredLength) {
            weight *= 2;
          }
          // Boost weight for 3-letter syllables as they tend to be more interesting
          if (s.syllable.length === 3) {
            weight *= 1.3;
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

  // Enhanced fallback with more varied syllables
  console.log('Using enhanced fallback syllables');
  const fallbackSyllables = {
    'let': [
      'ba', 'bi', 'bo', 'bu', 'da', 'di', 'do', 'fa', 'fi', 'fo', 'ga', 'gi', 'go', 'ha', 'hi', 'ho', 'ka', 'ki', 'ko',
      'la', 'li', 'lo', 'ma', 'mi', 'mo', 'na', 'ni', 'no', 'pa', 'pi', 'po', 'ra', 'ri', 'ro', 'sa', 'si', 'so',
      'ta', 'ti', 'to', 'va', 'vi', 'vo', 'za', 'zi', 'zo',
      'bil', 'dal', 'fal', 'gal', 'hal', 'kal', 'mal', 'pal', 'sal', 'tal', 'val',
      'bre', 'dre', 'fre', 'gre', 'kre', 'pre', 'tre'
    ],
    'mellem': [
      'ber', 'der', 'fer', 'ger', 'her', 'ker', 'ler', 'mer', 'per', 'ser', 'ter', 'ver',
      'bil', 'fil', 'mil', 'sil', 'til', 'vil',
      'bor', 'dor', 'for', 'kor', 'mor', 'por', 'sor', 'tor',
      'bro', 'dro', 'fro', 'gro', 'kro', 'pro', 'tro',
      'ble', 'fle', 'gle', 'kle', 'ple', 'tle',
      'bra', 'dra', 'fra', 'gra', 'kra', 'pra', 'tra'
    ],
    'svaer': [
      'tion', 'sion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting',
      'ende', 'ande', 'inde', 'unde', 'orde', 'erde',
      'else', 'anse', 'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste',
      'bel', 'del', 'fel', 'gel', 'hel', 'kel', 'mel', 'pel', 'sel', 'tel', 'vel'
    ]
  };
  
  const allSyllables = [...fallbackSyllables[difficulty]];
  
  // Filter out recently used syllables and prefer length variety
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  
  // First try preferred length
  let preferredLengthSyllables = availableSyllables.filter(s => s.length === preferredLength);
  
  // Use preferred length if we have enough options, otherwise use any available
  let finalSyllables = preferredLengthSyllables.length >= 3 ? preferredLengthSyllables : availableSyllables;
  
  // If we've used most syllables recently, partial reset
  if (finalSyllables.length < 3) {
    console.log('Most syllables recently used, partial reset...');
    const lastFew = recentlyUsed.slice(-3); // Keep only last 3 to avoid immediate repetition
    recentlyUsed = lastFew;
    finalSyllables = allSyllables.filter(s => !lastFew.includes(s));
    
    // Again try preferred length first
    preferredLengthSyllables = finalSyllables.filter(s => s.length === preferredLength);
    finalSyllables = preferredLengthSyllables.length >= 3 ? preferredLengthSyllables : finalSyllables;
  }
  
  // Fisher-Yates shuffle for better randomization
  for (let i = finalSyllables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalSyllables[i], finalSyllables[j]] = [finalSyllables[j], finalSyllables[i]];
  }
  
  const selectedSyllable = finalSyllables[0];
  console.log(`Selected fallback syllable: "${selectedSyllable}" (length: ${selectedSyllable.length})`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
