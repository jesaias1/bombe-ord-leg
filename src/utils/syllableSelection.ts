import { supabase } from '@/integrations/supabase/client';

// Keep track of recently used syllables with much larger memory
let recentlyUsed: string[] = [];
const MAX_RECENT = 50; // Much larger to prevent repetition

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
  console.log(`Selecting truly random syllable for difficulty: ${difficulty}`);
  console.log('Recently used syllables count:', recentlyUsed.length);
  
  // MASSIVE syllable pools for maximum variety - prioritizing vowel combinations
  const massiveSyllablePools = {
    'let': [
      // Single vowels and simple combinations
      'a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å',
      // Vowel + consonant
      'ab', 'ad', 'af', 'ag', 'ak', 'al', 'am', 'an', 'ap', 'ar', 'as', 'at', 'av',
      'eb', 'ed', 'ef', 'eg', 'ek', 'el', 'em', 'en', 'ep', 'er', 'es', 'et', 'ev',
      'ib', 'id', 'if', 'ig', 'ik', 'il', 'im', 'in', 'ip', 'ir', 'is', 'it', 'iv',
      'ob', 'od', 'of', 'og', 'ok', 'ol', 'om', 'on', 'op', 'or', 'os', 'ot', 'ov',
      'ub', 'ud', 'uf', 'ug', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut', 'uv',
      'yb', 'yd', 'yf', 'yg', 'yk', 'yl', 'ym', 'yn', 'yp', 'yr', 'ys', 'yt', 'yv',
      'æb', 'æd', 'æf', 'æg', 'æk', 'æl', 'æm', 'æn', 'æp', 'ær', 'æs', 'æt', 'æv',
      'øb', 'ød', 'øf', 'øg', 'øk', 'øl', 'øm', 'øn', 'øp', 'ør', 'øs', 'øt', 'øv',
      'åb', 'åd', 'åf', 'åg', 'åk', 'ål', 'åm', 'ån', 'åp', 'år', 'ås', 'åt', 'åv',
      // Consonant + vowel
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
      'za', 'ze', 'zi', 'zo', 'zu', 'zy', 'zæ', 'zø', 'zå'
    ],
    'mellem': [
      // Massive variety with vowel-heavy combinations
      'aa', 'ae', 'ai', 'ao', 'au', 'ay', 'aæ', 'aø', 'aå',
      'ea', 'ee', 'ei', 'eo', 'eu', 'ey', 'eæ', 'eø', 'eå',
      'ia', 'ie', 'ii', 'io', 'iu', 'iy', 'iæ', 'iø', 'iå',
      'oa', 'oe', 'oi', 'oo', 'ou', 'oy', 'oæ', 'oø', 'oå',
      'ua', 'ue', 'ui', 'uo', 'uu', 'uy', 'uæ', 'uø', 'uå',
      'ya', 'ye', 'yi', 'yo', 'yu', 'yy', 'yæ', 'yø', 'yå',
      'æa', 'æe', 'æi', 'æo', 'æu', 'æy', 'ææ', 'æø', 'æå',
      'øa', 'øe', 'øi', 'øo', 'øu', 'øy', 'øæ', 'øø', 'øå',
      'åa', 'åe', 'åi', 'åo', 'åu', 'åy', 'åæ', 'åø', 'åå',
      // Vowel + consonant + vowel
      'aba', 'abe', 'abi', 'abo', 'abu', 'aby', 'abæ', 'abø', 'abå',
      'ada', 'ade', 'adi', 'ado', 'adu', 'ady', 'adæ', 'adø', 'adå',
      'afa', 'afe', 'afi', 'afo', 'afu', 'afy', 'afæ', 'afø', 'afå',
      'aga', 'age', 'agi', 'ago', 'agu', 'agy', 'agæ', 'agø', 'agå',
      'aha', 'ahe', 'ahi', 'aho', 'ahu', 'ahy', 'ahæ', 'ahø', 'ahå',
      'aja', 'aje', 'aji', 'ajo', 'aju', 'ajy', 'ajæ', 'ajø', 'ajå',
      'aka', 'ake', 'aki', 'ako', 'aku', 'aky', 'akæ', 'akø', 'akå',
      'ala', 'ale', 'ali', 'alo', 'alu', 'aly', 'alæ', 'alø', 'alå',
      'ama', 'ame', 'ami', 'amo', 'amu', 'amy', 'amæ', 'amø', 'amå',
      'ana', 'ane', 'ani', 'ano', 'anu', 'any', 'anæ', 'anø', 'anå',
      'apa', 'ape', 'api', 'apo', 'apu', 'apy', 'apæ', 'apø', 'apå',
      'ara', 'are', 'ari', 'aro', 'aru', 'ary', 'aræ', 'arø', 'arå',
      'asa', 'ase', 'asi', 'aso', 'asu', 'asy', 'asæ', 'asø', 'aså',
      'ata', 'ate', 'ati', 'ato', 'atu', 'aty', 'atæ', 'atø', 'atå',
      'ava', 'ave', 'avi', 'avo', 'avu', 'avy', 'avæ', 'avø', 'avå',
      // Different consonant combinations with vowels
      'ba', 'be', 'bi', 'bo', 'bu', 'by', 'bæ', 'bø', 'bå',
      'ca', 'ce', 'ci', 'co', 'cu', 'cy', 'cæ', 'cø', 'cå',
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
      'wa', 'we', 'wi', 'wo', 'wu', 'wy', 'wæ', 'wø', 'wå',
      'xa', 'xe', 'xi', 'xo', 'xu', 'xy', 'xæ', 'xø', 'xå',
      'ya', 'ye', 'yi', 'yo', 'yu', 'yy', 'yæ', 'yø', 'yå',
      'za', 'ze', 'zi', 'zo', 'zu', 'zy', 'zæ', 'zø', 'zå',
      // Some consonant combinations (but fewer than before)
      'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr'
    ],
    'svaer': [
      // Complex combinations with vowels
      'abc', 'abd', 'abf', 'abg', 'abh', 'abj', 'abk', 'abl', 'abm', 'abn', 'abp', 'abr', 'abs', 'abt', 'abv', 'abw', 'abx', 'aby', 'abz',
      'bac', 'bad', 'baf', 'bag', 'bah', 'baj', 'bak', 'bal', 'bam', 'ban', 'bap', 'bar', 'bas', 'bat', 'bav', 'baw', 'bax', 'bay', 'baz',
      'cab', 'cad', 'caf', 'cag', 'cah', 'caj', 'cak', 'cal', 'cam', 'can', 'cap', 'car', 'cas', 'cat', 'cav', 'caw', 'cax', 'cay', 'caz',
      'dab', 'dac', 'daf', 'dag', 'dah', 'daj', 'dak', 'dal', 'dam', 'dan', 'dap', 'dar', 'das', 'dat', 'dav', 'daw', 'dax', 'day', 'daz',
      'fab', 'fac', 'fad', 'fae', 'fag', 'fah', 'faj', 'fak', 'fal', 'fam', 'fan', 'fap', 'far', 'fas', 'fat', 'fav', 'faw', 'fax', 'fay',
      'gab', 'gac', 'gad', 'gae', 'gaf', 'gah', 'gaj', 'gak', 'gal', 'gam', 'gan', 'gap', 'gar', 'gas', 'gat', 'gav', 'gaw', 'gax', 'gay',
      'hab', 'hac', 'had', 'hae', 'haf', 'hag', 'haj', 'hak', 'hal', 'ham', 'han', 'hap', 'har', 'has', 'hat', 'hav', 'haw', 'hax', 'hay',
      'jab', 'jac', 'jad', 'jae', 'jaf', 'jag', 'jah', 'jak', 'jal', 'jam', 'jan', 'jap', 'jar', 'jas', 'jat', 'jav', 'jaw', 'jax', 'jay',
      'kab', 'kac', 'kad', 'kae', 'kaf', 'kag', 'kah', 'kaj', 'kal', 'kam', 'kan', 'kap', 'kar', 'kas', 'kat', 'kav', 'kaw', 'kax', 'kay',
      'lab', 'lac', 'lad', 'lae', 'laf', 'lag', 'lah', 'laj', 'lak', 'lam', 'lan', 'lap', 'lar', 'las', 'lat', 'lav', 'law', 'lax', 'lay',
      'mab', 'mac', 'mad', 'mae', 'maf', 'mag', 'mah', 'maj', 'mak', 'mal', 'man', 'map', 'mar', 'mas', 'mat', 'mav', 'maw', 'max', 'may',
      'nab', 'nac', 'nad', 'nae', 'naf', 'nag', 'nah', 'naj', 'nak', 'nal', 'nam', 'nap', 'nar', 'nas', 'nat', 'nav', 'naw', 'nax', 'nay',
      'pab', 'pac', 'pad', 'pae', 'paf', 'pag', 'pah', 'paj', 'pak', 'pal', 'pam', 'pan', 'par', 'pas', 'pat', 'pav', 'paw', 'pax', 'pay',
      'rab', 'rac', 'rad', 'rae', 'raf', 'rag', 'rah', 'raj', 'rak', 'ral', 'ram', 'ran', 'rap', 'ras', 'rat', 'rav', 'raw', 'rax', 'ray',
      'sab', 'sac', 'sad', 'sae', 'saf', 'sag', 'sah', 'saj', 'sak', 'sal', 'sam', 'san', 'sap', 'sar', 'sas', 'sat', 'sav', 'saw', 'sax',
      'tab', 'tac', 'tad', 'tae', 'taf', 'tag', 'tah', 'taj', 'tak', 'tal', 'tam', 'tan', 'tap', 'tar', 'tas', 'tat', 'tav', 'taw', 'tax',
      'vab', 'vac', 'vad', 'vae', 'vaf', 'vag', 'vah', 'vaj', 'vak', 'val', 'vam', 'van', 'vap', 'var', 'vas', 'vat', 'vav', 'vaw', 'vax',
      'wab', 'wac', 'wad', 'wae', 'waf', 'wag', 'wah', 'waj', 'wak', 'wal', 'wam', 'wan', 'wap', 'war', 'was', 'wat', 'wav', 'waw', 'wax',
      'zab', 'zac', 'zad', 'zae', 'zaf', 'zag', 'zah', 'zaj', 'zak', 'zal', 'zam', 'zan', 'zap', 'zar', 'zas', 'zat', 'zav', 'zaw', 'zax'
    ]
  };

  // Use our massive pools directly - skip database entirely for variety
  const availablePool = massiveSyllablePools[difficulty];
  
  // Filter out recently used
  let candidates = availablePool.filter(s => !isRecentlyUsed(s));
  
  // If we've used too many, reset but keep some memory
  if (candidates.length < 20) {
    console.log('Resetting recently used to ensure maximum variety');
    recentlyUsed = recentlyUsed.slice(-10); // Keep only last 10
    candidates = availablePool.filter(s => !isRecentlyUsed(s));
  }
  
  // PURE random selection
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedSyllable = candidates[randomIndex];
  
  console.log(`Selected TRULY RANDOM syllable: "${selectedSyllable}" from ${candidates.length} candidates (total pool: ${availablePool.length})`);
  addToRecentlyUsed(selectedSyllable);
  
  return selectedSyllable;
};
