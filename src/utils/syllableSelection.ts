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
const MAX_RECENT = 15; // Remember last 15 syllables for better variety

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
      .gte('word_count', 8) // Slightly lower threshold for more variety
      .gte('char_length(syllable)', 2)
      .lte('char_length(syllable)', 4)
      .order('word_count', { ascending: false })
      .limit(500); // Higher limit for more options

    if (data && data.length > 0) {
      // Filter out problematic syllables and recently used ones
      const validSyllables = data.filter(s => {
        const syllable = s.syllable.toLowerCase();
        return (
          syllable.length >= 2 && 
          syllable.length <= 4 &&
          // Must contain at least one vowel
          /[aeiouyæøå]/.test(syllable) &&
          // Exclude problematic consonant clusters
          !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng'].includes(syllable) &&
          // Avoid starting with triple consonants
          !/^[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
          // Exclude single consonants and very short problematic combinations
          !(syllable.length === 2 && /^[bcdfghjklmnpqrstvwxz]{2}$/.test(syllable)) &&
          // Avoid recently used syllables
          !isRecentlyUsed(syllable)
        );
      });

      // If we filtered out too many, allow some recently used ones back but still avoid immediate repetition
      let syllablesToChooseFrom = validSyllables;
      if (validSyllables.length < 3) {
        const lastUsed = recentlyUsed.slice(-3); // Avoid only the last 3
        syllablesToChooseFrom = data.filter(s => {
          const syllable = s.syllable.toLowerCase();
          return (
            syllable.length >= 2 && 
            syllable.length <= 4 &&
            /[aeiouyæøå]/.test(syllable) &&
            !['ck', 'ft', 'pt', 'kt', 'xt', 'mp', 'ng'].includes(syllable) &&
            !/^[bcdfghjklmnpqrstvwxz]{3}/.test(syllable) &&
            !(syllable.length === 2 && /^[bcdfghjklmnpqrstvwxz]{2}$/.test(syllable)) &&
            !lastUsed.includes(syllable)
          );
        });
      }

      if (syllablesToChooseFrom.length > 0) {
        // Use weighted random selection favoring higher word counts
        const weights = syllablesToChooseFrom.map((s, i) => Math.max(1, s.word_count - i * 0.1));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const randomWeight = Math.random() * totalWeight;
        
        let currentWeight = 0;
        for (let i = 0; i < syllablesToChooseFrom.length; i++) {
          currentWeight += weights[i];
          if (randomWeight <= currentWeight) {
            const selectedSyllable = syllablesToChooseFrom[i].syllable;
            console.log(`Selected syllable from database: "${selectedSyllable}"`);
            addToRecentlyUsed(selectedSyllable);
            return selectedSyllable;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Fallback to curated syllables with strict anti-repetition
  console.log('Using fallback curated syllables');
  const allSyllables = [...CURATED_SYLLABLES[difficulty]];
  
  // Filter out recently used syllables first
  let availableSyllables = allSyllables.filter(s => !isRecentlyUsed(s));
  
  // If we've used most syllables recently, reset but keep last 3 off-limits
  if (availableSyllables.length < 5) {
    console.log('Most syllables recently used, partial reset...');
    const lastThree = recentlyUsed.slice(-3);
    recentlyUsed = lastThree; // Keep only last 3 to avoid immediate repetition
    availableSyllables = allSyllables.filter(s => !lastThree.includes(s));
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
