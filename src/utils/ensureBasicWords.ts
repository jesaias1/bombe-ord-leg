
import { supabase } from '@/integrations/supabase/client';

// Essential Danish words that should always be available
const ESSENTIAL_WORDS = [
  // Words with 'ng'
  'sang', 'gang', 'ring', 'ting', 'spring', 'bring', 'lang', 'trang', 'svang', 'klang',
  'lung', 'ung', 'bung', 'dung', 'gong', 'kong', 'dong', 'long', 'tong', 'song',
  
  // Words with 'sk'
  'skole', 'skal', 'ske', 'skin', 'sky', 'skib', 'skudt', 'skabe', 'skade', 'skag',
  'skat', 'skema', 'ski', 'skide', 'skind', 'skifte', 'skog', 'skotte', 'skulder',
  
  // Words with 'st'
  'stol', 'sten', 'stor', 'stue', 'stad', 'stage', 'stang', 'start', 'stat', 'sted',
  'stem', 'step', 'stil', 'stik', 'stop', 'straf', 'streg', 'strid', 'strog', 'stund',
  
  // Words with 'nd'
  'hånd', 'land', 'sand', 'brand', 'strand', 'grund', 'hund', 'mund', 'rund', 'bind',
  'find', 'sind', 'vind', 'blind', 'grind', 'kind', 'mind', 'lind', 'tind',
  
  // Common words
  'hus', 'bil', 'bog', 'mad', 'øl', 'vand', 'kaffe', 'te', 'brød', 'kød', 'fisk',
  'frugt', 'have', 'park', 'byen', 'land', 'menneske', 'barn', 'mor', 'far',
  'ven', 'arbejde', 'penge', 'tid', 'dag', 'nat', 'år', 'måned', 'uge'
];

export const ensureBasicWords = async () => {
  console.log('Ensuring essential Danish words are available...');
  
  try {
    const { error } = await supabase
      .from('danish_words')
      .upsert(
        ESSENTIAL_WORDS.map(word => ({ word: word.toLowerCase().trim() })),
        { onConflict: 'word' }
      );

    if (error) {
      console.error('Error ensuring basic words:', error);
      return false;
    }

    console.log(`Ensured ${ESSENTIAL_WORDS.length} essential words are available`);
    return true;
  } catch (err) {
    console.error('Unexpected error ensuring basic words:', err);
    return false;
  }
};
