import { supabase } from '@/integrations/supabase/client';

// Curated list of common Danish syllables that create many valid words
const CURATED_SYLLABLES = {
  'let': [
    'er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne',
    'me', 'ge', 'be', 'he', 'pe', 've', 'fe', 'je', 'at', 'og',
    'in', 'an', 'on', 'ar', 'or', 'el', 'al', 'ul', 'il', 'ol',
    'is', 'as', 'os', 'us', 'av', 'ov', 'iv', 'ry', 'ly', 'my',
    'ind', 'and', 'end', 'ing', 'age', 'ide', 'ade', 'ede', 'ige'
  ],
  'mellem': [
    'ing', 'end', 'and', 'hed', 'ter', 'der', 'ner', 'ler', 'rer', 'ser',
    'ker', 'ger', 'ber', 'per', 'ver', 'fer', 'mer', 'her', 'ste', 'nde',
    'nne', 'lle', 'rre', 'sse', 'tte', 'kke', 'mme', 'nge', 'rse', 'lse',
    'age', 'ige', 'uge', 'ege', 'øge', 'åge', 'ide', 'ade', 'ude', 'ede',
    'or', 'er', 'ar', 'el', 'al', 'il', 'ol', 'ul', 'en', 'an', 'on',
    'tion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting'
  ],
  'svaer': [
    'tion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting',
    'ende', 'ande', 'inde', 'unde', 'erde', 'orde', 'ilde', 'else', 'anse',
    'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste', 'erte', 'arte',
    'sion', 'gion', 'kion', 'pion', 'vion', 'fion', 'mion', 'nion',
    'er', 'ar', 'or', 'el', 'al', 'il', 'ol', 'ul', 'en', 'an', 'on'
  ]
};

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
let lastSyllableLength: number | null = null;
const MAX_RECENT = 8; // Remember last 8 syllables for better variety

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
    // Try to get syllables from database with good word coverage
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 5) // Lower threshold for more variety
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 3) // Focus on 2-3 letter syllables
      .order('word_count', { ascending: false })
      .limit(1000); // Higher limit for more options

    if (data && data.length > 0) {
      // Filter syllables by quality and avoid recently used ones
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 3 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Exclude problematic consonant clusters
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st'].some(cluster => syllable === cluster) &&
          // Exclude single consonants
          !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
          // Avoid recently used syllables (strict anti-repetition)
          !isRecentlyUsed(syllable)
        );
      });

      // First try to get syllables of preferred length
      let preferredSyllables = validSyllables.filter(s => s.syllable.length === preferredLength);
      
      // If not enough of preferred length, use any valid syllables
      let syllablesToChooseFrom = preferredSyllables.length >= 3 ? preferredSyllables : validSyllables;
      
      // If we still don't have enough options, allow some recently used (but not the last one)
      if (syllablesToChooseFrom.length < 3 && recentlyUsed.length > 0) {
        const lastUsed = recentlyUsed[recentlyUsed.length - 1]; // Only avoid the very last one
        syllablesToChooseFrom = data.filter(s => {
          const syllable = s.syllable.toLowerCase();
          return (
            syllable.length >= 2 && 
            syllable.length <= 3 &&
            /[aeiouyæøå]/.test(syllable) &&
            !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng', 'nt', 'st'].some(cluster => syllable === cluster) &&
            !/^[bcdfghjklmnpqrstvwxz]+$/.test(syllable) &&
            syllable !== lastUsed // Only avoid the very last syllable
          );
        });
      }

      if (syllablesToChooseFrom.length > 0) {
        // Use weighted random selection favoring higher word counts and preferred length
        const weights = syllablesToChooseFrom.map((s, i) => {
          let weight = Math.max(1, s.word_count - i * 0.1);
          // Boost weight for preferred length
          if (s.syllable.length === preferredLength) {
            weight *= 1.5;
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
            console.log(`Selected syllable from database: "${selectedSyllable}" (length: ${selectedSyllable.length})`);
            addToRecentlyUsed(selectedSyllable);
            return selectedSyllable;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables with strict anti-repetition and length preference
  console.log('Using fallback curated syllables');
  const allSyllables = [...CURATED_SYLLABLES[difficulty]];
  
  // Filter out recently used syllables and prefer length variety
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  
  // First try preferred length
  let preferredLengthSyllables = availableSyllables.filter(s => s.length === preferredLength);
  
  // Use preferred length if we have enough options, otherwise use any available
  let finalSyllables = preferredLengthSyllables.length >= 3 ? preferredLengthSyllables : availableSyllables;
  
  // If we've used most syllables recently, reset but keep last one off-limits
  if (finalSyllables.length < 3) {
    console.log('Most syllables recently used, partial reset...');
    const lastOne = recentlyUsed.slice(-1);
    recentlyUsed = lastOne; // Keep only last 1 to avoid immediate repetition
    finalSyllables = allSyllables.filter(s => !lastOne.includes(s));
    
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
