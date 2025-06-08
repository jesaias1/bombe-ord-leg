import { supabase } from '@/integrations/supabase/client';

// Curated list of common Danish syllables that create many valid words
const CURATED_SYLLABLES = {
  'let': [
    'er', 'en', 'et', 'de', 'se', 'te', 'le', 'ke', 're', 'ne',
    'me', 'ge', 'be', 'he', 'pe', 've', 'fe', 'je', 'at', 'og',
    'in', 'an', 'on', 'ar', 'or', 'el', 'al', 'ul', 'il', 'ol',
    'is', 'as', 'os', 'us', 'av', 'ov', 'iv', 'ry', 'ly', 'my'
  ],
  'mellem': [
    'ing', 'end', 'and', 'hed', 'ter', 'der', 'ner', 'ler', 'rer', 'ser',
    'ker', 'ger', 'ber', 'per', 'ver', 'fer', 'mer', 'her', 'ste', 'nde',
    'nne', 'lle', 'rre', 'sse', 'tte', 'kke', 'mme', 'nge', 'rse', 'lse',
    'age', 'ige', 'uge', 'ege', 'øge', 'åge', 'ide', 'ade', 'ude', 'ede'
  ],
  'svaer': [
    'tion', 'ning', 'ling', 'ring', 'ding', 'sing', 'king', 'ting',
    'ende', 'ande', 'inde', 'unde', 'erde', 'orde', 'ilde', 'else', 'anse',
    'ense', 'iske', 'aste', 'este', 'iste', 'oste', 'uste', 'erte', 'arte',
    'tion', 'sion', 'gion', 'kion', 'pion', 'vion', 'fion', 'mion', 'nion'
  ]
};

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
const MAX_RECENT = 10; // Remember last 10 syllables

const addToRecentlyUsed = (syllable: string) => {
  recentlyUsed.push(syllable.toLowerCase());
  if (recentlyUsed.length > MAX_RECENT) {
    recentlyUsed.shift();
  }
};

const isRecentlyUsed = (syllable: string) => {
  return recentlyUsed.includes(syllable.toLowerCase());
};

export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  
  try {
    // Try to get syllables from database with good word coverage
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable, word_count')
      .eq('difficulty', difficulty)
      .gte('word_count', 10) // Lower threshold for more variety
      .gte('length(syllable)', 2)
      .lte('length(syllable)', 4)
      .order('word_count', { ascending: false })
      .limit(300); // Higher limit for more options

    if (data && data.length > 0) {
      // Filter out problematic syllables and recently used ones
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 4 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Only exclude the most problematic consonant clusters
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp'].includes(syllable) &&
          // Avoid starting with triple consonants
          !/^[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
          // Exclude single consonants
          syllable.length > 1 &&
          // Avoid recently used syllables
          !isRecentlyUsed(syllable)
        );
      });

      // If we filtered out too many, allow recently used ones back in
      let syllablesToChooseFrom = validSyllables;
      if (validSyllables.length < 5) {
        syllablesToChooseFrom = data.filter(s => {
          const syllable = s.syllable.toLowerCase();
          return (
            syllable.length >= 2 && 
            syllable.length <= 4 &&
            /[aeiouyæøå]/.test(syllable) &&
            !['ck', 'ft', 'pt', 'kt', 'xt', 'mp'].includes(syllable) &&
            !/^[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
            syllable.length > 1
          );
        });
      }

      if (syllablesToChooseFrom.length > 0) {
        // Use pure random selection for better variety
        const randomIndex = Math.floor(Math.random() * syllablesToChooseFrom.length);
        const selectedSyllable = syllablesToChooseFrom[randomIndex].syllable;
        console.log(`Selected syllable from database: "${selectedSyllable}"`);
        addToRecentlyUsed(selectedSyllable);
        return selectedSyllable;
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables with better anti-repetition
  console.log('Using fallback curated syllables');
  const allSyllables = [...CURATED_SYLLABLES[difficulty]];
  
  // Filter out recently used syllables first
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  
  // If we've used most syllables recently, reset and use all
  if (availableSyllables.length < 3) {
    console.log('Most syllables recently used, resetting...');
    recentlyUsed = [];
    availableSyllables = allSyllables;
  }
  
  // Fisher-Yates shuffle for better randomization
  for (let i = availableSyllables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableSyllables[i], availableSyllables[j]] = [availableSyllables[j], availableSyllables[i]];
  }
  
  const selectedSyllable = availableSyllables[0];
  console.log(`Selected fallback syllable: "${selectedSyllable}"`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
