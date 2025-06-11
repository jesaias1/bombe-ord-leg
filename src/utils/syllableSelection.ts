
import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables to avoid immediate repetition
let recentlyUsed: string[] = [];
const MAX_RECENT = 3; // Very small to allow maximum variety

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
  console.log(`Selecting TRULY random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables:', recentlyUsed);
  
  try {
    // Get ALL syllables from database - no filtering, maximum pool
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', difficulty);

    if (data && data.length > 0) {
      console.log(`Found ${data.length} total syllables in database`);
      
      // MINIMAL filtering - only remove recently used
      let availableSyllables = data.filter(s => !isRecentlyUsed(s.syllable));
      
      // If too few available, reset recently used completely
      if (availableSyllables.length < 10) {
        console.log('Resetting recently used for maximum variety');
        recentlyUsed = [];
        availableSyllables = data;
      }

      // PURE RANDOM selection - no preferences whatsoever
      const randomIndex = Math.floor(Math.random() * availableSyllables.length);
      const selectedSyllable = availableSyllables[randomIndex].syllable;
      
      console.log(`Selected TRULY random syllable: "${selectedSyllable}" from ${availableSyllables.length} options`);
      addToRecentlyUsed(selectedSyllable);
      return selectedSyllable;
    }
  } catch (error) {
    console.error('Error fetching syllables from database:', error);
  }

  // Massive fallback arrays for maximum randomness
  console.log('Using MASSIVE fallback arrays for maximum variety');
  const fallbackSyllables = {
    'let': [
      // Vowel-heavy simple syllables
      'a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å',
      'ba', 'be', 'bi', 'bo', 'bu', 'by', 'bæ', 'bø', 'bå',
      'da', 'de', 'di', 'do', 'du', 'dy', 'dæ', 'dø', 'då',
      'fa', 'fe', 'fi', 'fo', 'fu', 'fy', 'fæ', 'fø', 'få',
      'ga', 'ge', 'gi', 'go', 'gu', 'gy', 'gæ', 'gø', 'gå',
      'ha', 'he', 'hi', 'ho', 'hu', 'hy', 'hæ', 'hø', 'hå',
      'ja', 'je', 'ji', 'jo', 'ju', 'jy', 'jæ', 'jø', 'jå',
      'ka', 'ke', 'ki', 'ko', 'ku', 'ky', 'kæ', 'kø', 'kå',
      'la', 'le', 'li', 'lo', 'lu', 'ly', 'læ', 'lø', 'lå',
      'ma', 'me', 'mi', 'mo', 'mu', 'my', 'mæ', 'mø', 'må',
      'na', 'ne', 'ni', 'no', 'nu', 'ny', 'næ', 'nø', 'nå',
      'pa', 'pe', 'pi', 'po', 'pu', 'py', 'pæ', 'pø', 'på',
      'ra', 're', 'ri', 'ro', 'ru', 'ry', 'ræ', 'rø', 'rå',
      'sa', 'se', 'si', 'so', 'su', 'sy', 'sæ', 'sø', 'så',
      'ta', 'te', 'ti', 'to', 'tu', 'ty', 'tæ', 'tø', 'tå',
      'va', 've', 'vi', 'vo', 'vu', 'vy', 'væ', 'vø', 'vå',
      'za', 'ze', 'zi', 'zo', 'zu', 'zy', 'zæ', 'zø', 'zå',
      'ab', 'ad', 'af', 'ag', 'ak', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'av',
      'eb', 'ed', 'ef', 'eg', 'ek', 'el', 'em', 'en', 'ep', 'er', 'es', 'et', 'ev',
      'ib', 'id', 'if', 'ig', 'ik', 'il', 'im', 'in', 'ip', 'ir', 'is', 'it', 'iv',
      'ob', 'od', 'of', 'og', 'ok', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot', 'ov',
      'ub', 'ud', 'uf', 'ug', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut', 'uv'
    ],
    'mellem': [
      // Maximum variety - every possible combination
      'ab', 'ad', 'af', 'ag', 'ak', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'av', 'ax', 'ay', 'az',
      'ba', 'be', 'bi', 'bo', 'bu', 'by', 'bæ', 'bø', 'bå', 'bl', 'br', 'bj', 'bd', 'bf', 'bg', 'bh',
      'ca', 'ce', 'ci', 'co', 'cu', 'cy', 'cæ', 'cø', 'cå', 'cl', 'cr', 'ch', 'ck', 'cd', 'cf', 'cg',
      'da', 'de', 'di', 'do', 'du', 'dy', 'dæ', 'dø', 'då', 'dr', 'dl', 'dj', 'dv', 'db', 'dc', 'df',
      'ea', 'eb', 'ec', 'ed', 'ef', 'eg', 'eh', 'ej', 'ek', 'el', 'em', 'en', 'ep', 'er', 'es', 'et',
      'fa', 'fe', 'fi', 'fo', 'fu', 'fy', 'fæ', 'fø', 'få', 'fl', 'fr', 'fj', 'ft', 'fb', 'fc', 'fd',
      'ga', 'ge', 'gi', 'go', 'gu', 'gy', 'gæ', 'gø', 'gå', 'gl', 'gr', 'gj', 'gn', 'gb', 'gc', 'gd',
      'ha', 'he', 'hi', 'ho', 'hu', 'hy', 'hæ', 'hø', 'hå', 'hj', 'hv', 'hr', 'hl', 'hb', 'hc', 'hd',
      'ia', 'ib', 'ic', 'id', 'if', 'ig', 'ih', 'ij', 'ik', 'il', 'im', 'in', 'ip', 'ir', 'is', 'it',
      'ja', 'je', 'ji', 'jo', 'ju', 'jy', 'jæ', 'jø', 'jå', 'jr', 'jl', 'jn', 'jt', 'jb', 'jc', 'jd',
      'ka', 'ke', 'ki', 'ko', 'ku', 'ky', 'kæ', 'kø', 'kå', 'kl', 'kr', 'kj', 'kn', 'kt', 'kb', 'kc',
      'la', 'le', 'li', 'lo', 'lu', 'ly', 'læ', 'lø', 'lå', 'lj', 'lr', 'ln', 'lt', 'lb', 'lc', 'ld',
      'ma', 'me', 'mi', 'mo', 'mu', 'my', 'mæ', 'mø', 'må', 'mj', 'mr', 'ml', 'mn', 'mt', 'mb', 'mc',
      'na', 'ne', 'ni', 'no', 'nu', 'ny', 'næ', 'nø', 'nå', 'nj', 'nr', 'nl', 'nt', 'nb', 'nc', 'nd',
      'oa', 'ob', 'oc', 'od', 'of', 'og', 'oh', 'oj', 'ok', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot',
      'pa', 'pe', 'pi', 'po', 'pu', 'py', 'pæ', 'pø', 'på', 'pl', 'pr', 'pj', 'pt', 'pb', 'pc', 'pd',
      'qa', 'qe', 'qi', 'qo', 'qu', 'qy', 'qæ', 'qø', 'qå', 'ql', 'qr', 'qj', 'qt', 'qb', 'qc', 'qd',
      'ra', 're', 'ri', 'ro', 'ru', 'ry', 'ræ', 'rø', 'rå', 'rj', 'rl', 'rn', 'rt', 'rb', 'rc', 'rd',
      'sa', 'se', 'si', 'so', 'su', 'sy', 'sæ', 'sø', 'så', 'sl', 'sr', 'sj', 'sn', 'st', 'sp', 'sk',
      'ta', 'te', 'ti', 'to', 'tu', 'ty', 'tæ', 'tø', 'tå', 'tj', 'tr', 'tl', 'tn', 'tb', 'tc', 'td',
      'ua', 'ub', 'uc', 'ud', 'uf', 'ug', 'uh', 'uj', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut',
      'va', 've', 'vi', 'vo', 'vu', 'vy', 'væ', 'vø', 'vå', 'vj', 'vr', 'vl', 'vn', 'vt', 'vb', 'vc',
      'wa', 'we', 'wi', 'wo', 'wu', 'wy', 'wæ', 'wø', 'wå', 'wj', 'wr', 'wl', 'wn', 'wt', 'wb', 'wc',
      'xa', 'xe', 'xi', 'xo', 'xu', 'xy', 'xæ', 'xø', 'xå', 'xj', 'xr', 'xl', 'xn', 'xt', 'xb', 'xc',
      'ya', 'ye', 'yi', 'yo', 'yu', 'yy', 'yæ', 'yø', 'yå', 'yj', 'yr', 'yl', 'yn', 'yt', 'yb', 'yc',
      'za', 'ze', 'zi', 'zo', 'zu', 'zy', 'zæ', 'zø', 'zå', 'zj', 'zr', 'zl', 'zn', 'zt', 'zb', 'zc'
    ],
    'svaer': [
      // Same massive variety for hard difficulty
      'abc', 'abd', 'abf', 'abg', 'abh', 'abj', 'abk', 'abl', 'abm', 'abn', 'abp', 'abr', 'abs', 'abt',
      'bac', 'bad', 'baf', 'bag', 'bah', 'baj', 'bak', 'bal', 'bam', 'ban', 'bap', 'bar', 'bas', 'bat',
      'cab', 'cad', 'caf', 'cag', 'cah', 'caj', 'cak', 'cal', 'cam', 'can', 'cap', 'car', 'cas', 'cat',
      'dab', 'dac', 'daf', 'dag', 'dah', 'daj', 'dak', 'dal', 'dam', 'dan', 'dap', 'dar', 'das', 'dat',
      'eab', 'eac', 'ead', 'eaf', 'eag', 'eah', 'eaj', 'eak', 'eal', 'eam', 'ean', 'eap', 'ear', 'eas',
      'fab', 'fac', 'fad', 'fae', 'fag', 'fah', 'faj', 'fak', 'fal', 'fam', 'fan', 'fap', 'far', 'fas',
      'gab', 'gac', 'gad', 'gae', 'gaf', 'gah', 'gaj', 'gak', 'gal', 'gam', 'gan', 'gap', 'gar', 'gas',
      'hab', 'hac', 'had', 'hae', 'haf', 'hag', 'haj', 'hak', 'hal', 'ham', 'han', 'hap', 'har', 'has',
      'jab', 'jac', 'jad', 'jae', 'jaf', 'jag', 'jah', 'jak', 'jal', 'jam', 'jan', 'jap', 'jar', 'jas',
      'kab', 'kac', 'kad', 'kae', 'kaf', 'kag', 'kah', 'kaj', 'kal', 'kam', 'kan', 'kap', 'kar', 'kas',
      'lab', 'lac', 'lad', 'lae', 'laf', 'lag', 'lah', 'laj', 'lak', 'lam', 'lan', 'lap', 'lar', 'las',
      'mab', 'mac', 'mad', 'mae', 'maf', 'mag', 'mah', 'maj', 'mak', 'mal', 'man', 'map', 'mar', 'mas',
      'nab', 'nac', 'nad', 'nae', 'naf', 'nag', 'nah', 'naj', 'nak', 'nal', 'nam', 'nap', 'nar', 'nas',
      'pab', 'pac', 'pad', 'pae', 'paf', 'pag', 'pah', 'paj', 'pak', 'pal', 'pam', 'pan', 'par', 'pas',
      'rab', 'rac', 'rad', 'rae', 'raf', 'rag', 'rah', 'raj', 'rak', 'ral', 'ram', 'ran', 'rap', 'ras',
      'sab', 'sac', 'sad', 'sae', 'saf', 'sag', 'sah', 'saj', 'sak', 'sal', 'sam', 'san', 'sap', 'sar',
      'tab', 'tac', 'tad', 'tae', 'taf', 'tag', 'tah', 'taj', 'tak', 'tal', 'tam', 'tan', 'tap', 'tar',
      'vab', 'vac', 'vad', 'vae', 'vaf', 'vag', 'vah', 'vaj', 'vak', 'val', 'vam', 'van', 'vap', 'var',
      'wab', 'wac', 'wad', 'wae', 'waf', 'wag', 'wah', 'waj', 'wak', 'wal', 'wam', 'wan', 'wap', 'war',
      'zab', 'zac', 'zad', 'zae', 'zaf', 'zag', 'zah', 'zaj', 'zak', 'zal', 'zam', 'zan', 'zap', 'zer'
    ]
  };
  
  const allOptions = fallbackSyllables[difficulty];
  
  // Filter out recently used only
  let availableOptions = allOptions.filter(s => !isRecentlyUsed(s));
  
  // If too few available, reset completely for maximum variety
  if (availableOptions.length < 20) {
    console.log('Resetting recently used for MAXIMUM fallback variety');
    recentlyUsed = [];
    availableOptions = allOptions;
  }
  
  // COMPLETELY RANDOM selection
  const randomIndex = Math.floor(Math.random() * availableOptions.length);
  const selectedSyllable = availableOptions[randomIndex];
  
  console.log(`Selected TRULY random fallback: "${selectedSyllable}" from ${availableOptions.length} total options`);
  addToRecentlyUsed(selectedSyllable);
  return selectedSyllable;
};
