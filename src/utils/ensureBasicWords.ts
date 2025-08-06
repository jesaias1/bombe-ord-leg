
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

  // Words with 'eg'
  'leg', 'beg', 'reg', 'seg', 'slægt', 'slægtgård', 'slægtskab', 'slægtning',
  'ægget', 'begge', 'regn', 'regne', 'regner', 'regnede', 'regnet', 'regering',
  'begynde', 'begynder', 'begyndte', 'begyndt', 'begreb', 'begribt', 'begrebe',
  'vegetar', 'vegetation', 'vegansk', 'veganisme',

  // Common verbs and their forms - basic verbs
  'gå', 'går', 'gik', 'gået', 'komme', 'kommer', 'kom', 'kommet', 'se', 'ser', 'så', 'set',
  'have', 'har', 'havde', 'haft', 'være', 'er', 'var', 'været', 'blive', 'bliver', 'blev', 'blevet',
  'sige', 'siger', 'sagde', 'sagt', 'tage', 'tager', 'tog', 'taget',
  
  // Stretch/string related verbs
  'strække', 'strækker', 'strakte', 'strakt', 'strukket', 'strukke',
  'stramme', 'strammer', 'strammede', 'strammet', 'stram',
  
  // Send/send related verbs  
  'sende', 'sender', 'sendte', 'sendt', 'send',
  'give', 'giver', 'gav', 'givet', 'få', 'får', 'fik', 'fået',
  
  // Knit/stitch related words
  'strikke', 'strikker', 'strikkede', 'strikket', 'strik',
  
  // More essential verbs and forms
  'spise', 'spiser', 'spiste', 'spist', 'drikke', 'drikker', 'drak', 'drukket',
  'købe', 'køber', 'købte', 'købt', 'sælge', 'sælger', 'solgte', 'solgt',
  'læse', 'læser', 'læste', 'læst', 'skrive', 'skriver', 'skrev', 'skrevet',
  'høre', 'hører', 'hørte', 'hørt', 'tale', 'taler', 'talte', 'talt',
  'lege', 'leger', 'legede', 'leget', 'arbejde', 'arbejder', 'arbejdede', 'arbejdet',
  
  // Common compound words that might be missing
  'slægtgård', 'bondegård', 'hovedgård', 'herregård', 'kærlighed', 'ægteskab',
  'barnebarn', 'oldefar', 'oldemor', 'bedstefar', 'bedstemor',
  'arbejdsplads', 'arbejdsgiver', 'arbejdstager',
  
  // Common words
  'hus', 'bil', 'bog', 'mad', 'øl', 'vand', 'kaffe', 'te', 'brød', 'kød', 'fisk',
  'frugt', 'have', 'park', 'byen', 'land', 'menneske', 'barn', 'mor', 'far',
  'ven', 'arbejde', 'penge', 'tid', 'dag', 'nat', 'år', 'måned', 'uge',
  
  // Common adjectives and past participles
  'rød', 'blå', 'grøn', 'gul', 'sort', 'hvid', 'stor', 'lille', 'lang', 'kort',
  'god', 'dårlig', 'ny', 'gammel', 'ung', 'varm', 'kold', 'let', 'tung', 'høj', 'lav'
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
