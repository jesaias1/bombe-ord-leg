
import { supabase } from '@/integrations/supabase/client';

// Completely remove any memory system - pure random every time
export const selectRandomSyllable = async (difficulty: 'let' | 'mellem' | 'svaer'): Promise<string | null> => {
  console.log(`Selecting PURE RANDOM syllable for difficulty: ${difficulty}`);
  
  // MASSIVE syllable pools with heavy emphasis on variety
  const trulyRandomPools = {
    'let': [
      // Single vowels
      'a', 'e', 'i', 'o', 'u', 'y', 'æ', 'ø', 'å',
      // Vowel combinations (heavy emphasis)
      'ai', 'au', 'ei', 'eu', 'ou', 'oy', 'ay', 'ey', 'uy', 'yi',
      'æi', 'æu', 'øi', 'øu', 'åi', 'åu', 'åy', 'æy', 'øy',
      'ia', 'ie', 'io', 'iu', 'ua', 'ue', 'ui', 'uo',
      // Simple consonant-vowel
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
      // Vowel-heavy combinations for variety
      'aa', 'ae', 'ai', 'ao', 'au', 'ay', 'aæ', 'aø', 'aå',
      'ea', 'ee', 'ei', 'eo', 'eu', 'ey', 'eæ', 'eø', 'eå',
      'ia', 'ie', 'ii', 'io', 'iu', 'iy', 'iæ', 'iø', 'iå',
      'oa', 'oe', 'oi', 'oo', 'ou', 'oy', 'oæ', 'oø', 'oå',
      'ua', 'ue', 'ui', 'uo', 'uu', 'uy', 'uæ', 'uø', 'uå',
      'ya', 'ye', 'yi', 'yo', 'yu', 'yy', 'yæ', 'yø', 'yå',
      'æa', 'æe', 'æi', 'æo', 'æu', 'æy', 'ææ', 'æø', 'æå',
      'øa', 'øe', 'øi', 'øo', 'øu', 'øy', 'øæ', 'øø', 'øå',
      'åa', 'åe', 'åi', 'åo', 'åu', 'åy', 'åæ', 'åø', 'åå',
      // Three-letter vowel-consonant-vowel combinations
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
      'awa', 'awe', 'awi', 'awo', 'awu', 'awy', 'awæ', 'awø', 'awå',
      // Consonant-vowel-consonant with variety
      'bac', 'bad', 'baf', 'bag', 'bah', 'baj', 'bak', 'bal', 'bam', 'ban', 'bap', 'bar', 'bas', 'bat', 'bav', 'baw', 'bax', 'bay', 'baz',
      'cad', 'caf', 'cag', 'cah', 'caj', 'cak', 'cal', 'cam', 'can', 'cap', 'car', 'cas', 'cat', 'cav', 'caw', 'cax', 'cay', 'caz',
      'dab', 'dac', 'daf', 'dag', 'dah', 'daj', 'dak', 'dal', 'dam', 'dan', 'dap', 'dar', 'das', 'dat', 'dav', 'daw', 'dax', 'day', 'daz',
      'fab', 'fac', 'fad', 'fag', 'fah', 'faj', 'fak', 'fal', 'fam', 'fan', 'fap', 'far', 'fas', 'fat', 'fav', 'faw', 'fax', 'fay', 'faz',
      'gab', 'gac', 'gad', 'gaf', 'gah', 'gaj', 'gak', 'gal', 'gam', 'gan', 'gap', 'gar', 'gas', 'gat', 'gav', 'gaw', 'gax', 'gay', 'gaz',
      'hab', 'hac', 'had', 'haf', 'hag', 'haj', 'hak', 'hal', 'ham', 'han', 'hap', 'har', 'has', 'hat', 'hav', 'haw', 'hax', 'hay', 'haz',
      'jab', 'jac', 'jad', 'jaf', 'jag', 'jah', 'jak', 'jal', 'jam', 'jan', 'jap', 'jar', 'jas', 'jat', 'jav', 'jaw', 'jax', 'jay', 'jaz',
      'kab', 'kac', 'kad', 'kaf', 'kag', 'kah', 'kaj', 'kal', 'kam', 'kan', 'kap', 'kar', 'kas', 'kat', 'kav', 'kaw', 'kax', 'kay', 'kaz',
      'lab', 'lac', 'lad', 'laf', 'lag', 'lah', 'laj', 'lak', 'lam', 'lan', 'lap', 'lar', 'las', 'lat', 'lav', 'law', 'lax', 'lay', 'laz',
      'mab', 'mac', 'mad', 'maf', 'mag', 'mah', 'maj', 'mak', 'mal', 'man', 'map', 'mar', 'mas', 'mat', 'mav', 'maw', 'max', 'may', 'maz',
      'nab', 'nac', 'nad', 'naf', 'nag', 'nah', 'naj', 'nak', 'nal', 'nam', 'nap', 'nar', 'nas', 'nat', 'nav', 'naw', 'nax', 'nay', 'naz',
      'pab', 'pac', 'pad', 'paf', 'pag', 'pah', 'paj', 'pak', 'pal', 'pam', 'pan', 'par', 'pas', 'pat', 'pav', 'paw', 'pax', 'pay', 'paz',
      'rab', 'rac', 'rad', 'raf', 'rag', 'rah', 'raj', 'rak', 'ral', 'ram', 'ran', 'rap', 'ras', 'rat', 'rav', 'raw', 'rax', 'ray', 'raz',
      'sab', 'sac', 'sad', 'saf', 'sag', 'sah', 'saj', 'sal', 'sam', 'san', 'sap', 'sar', 'sas', 'sat', 'sav', 'saw', 'sax', 'say', 'saz',
      'tab', 'tac', 'tad', 'taf', 'tag', 'tah', 'taj', 'tak', 'tal', 'tam', 'tan', 'tap', 'tar', 'tas', 'tat', 'tav', 'taw', 'tax', 'tay', 'taz',
      'vab', 'vac', 'vad', 'vaf', 'vag', 'vah', 'vaj', 'vak', 'val', 'vam', 'van', 'vap', 'var', 'vas', 'vat', 'vav', 'vaw', 'vax', 'vay', 'vaz',
      'wab', 'wac', 'wad', 'waf', 'wag', 'wah', 'waj', 'wak', 'wal', 'wam', 'wan', 'wap', 'war', 'was', 'wat', 'wav', 'waw', 'wax', 'way', 'waz',
      'zab', 'zac', 'zad', 'zaf', 'zag', 'zah', 'zaj', 'zak', 'zal', 'zam', 'zan', 'zap', 'zar', 'zas', 'zat', 'zav', 'zaw', 'zax', 'zay', 'zaz',
      // Some simple consonant clusters but much fewer
      'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr'
    ],
    'svaer': [
      // Complex three-letter combinations with more consonants
      'abc', 'abd', 'abf', 'abg', 'abh', 'abj', 'abk', 'abl', 'abm', 'abn', 'abp', 'abr', 'abs', 'abt', 'abv', 'abw', 'abx', 'aby', 'abz',
      'acb', 'acd', 'acf', 'acg', 'ach', 'acj', 'ack', 'acl', 'acm', 'acn', 'acp', 'acr', 'acs', 'act', 'acv', 'acw', 'acx', 'acy', 'acz',
      'adb', 'adc', 'adf', 'adg', 'adh', 'adj', 'adk', 'adl', 'adm', 'adn', 'adp', 'adr', 'ads', 'adt', 'adv', 'adw', 'adx', 'ady', 'adz',
      'afb', 'afc', 'afd', 'afg', 'afh', 'afj', 'afk', 'afl', 'afm', 'afn', 'afp', 'afr', 'afs', 'aft', 'afv', 'afw', 'afx', 'afy', 'afz',
      'agb', 'agc', 'agd', 'agf', 'agh', 'agj', 'agk', 'agl', 'agm', 'agn', 'agp', 'agr', 'ags', 'agt', 'agv', 'agw', 'agx', 'agy', 'agz',
      'ahb', 'ahc', 'ahd', 'ahf', 'ahg', 'ahj', 'ahk', 'ahl', 'ahm', 'ahn', 'ahp', 'ahr', 'ahs', 'aht', 'ahv', 'ahw', 'ahx', 'ahy', 'ahz',
      'ajb', 'ajc', 'ajd', 'ajf', 'ajg', 'ajh', 'ajk', 'ajl', 'ajm', 'ajn', 'ajp', 'ajr', 'ajs', 'ajt', 'ajv', 'ajw', 'ajx', 'ajy', 'ajz',
      'akb', 'akc', 'akd', 'akf', 'akg', 'akh', 'akj', 'akl', 'akm', 'akn', 'akp', 'akr', 'aks', 'akt', 'akv', 'akw', 'akx', 'aky', 'akz',
      'alb', 'alc', 'ald', 'alf', 'alg', 'alh', 'alj', 'alk', 'alm', 'aln', 'alp', 'alr', 'als', 'alt', 'alv', 'alw', 'alx', 'aly', 'alz',
      'amb', 'amc', 'amd', 'amf', 'amg', 'amh', 'amj', 'amk', 'aml', 'amn', 'amp', 'amr', 'ams', 'amt', 'amv', 'amw', 'amx', 'amy', 'amz',
      'anb', 'anc', 'and', 'anf', 'ang', 'anh', 'anj', 'ank', 'anl', 'anm', 'anp', 'anr', 'ans', 'ant', 'anv', 'anw', 'anx', 'any', 'anz',
      'apb', 'apc', 'apd', 'apf', 'apg', 'aph', 'apj', 'apk', 'apl', 'apm', 'apn', 'apr', 'aps', 'apt', 'apv', 'apw', 'apx', 'apy', 'apz',
      'arb', 'arc', 'ard', 'arf', 'arg', 'arh', 'arj', 'ark', 'arl', 'arm', 'arn', 'arp', 'ars', 'art', 'arv', 'arw', 'arx', 'ary', 'arz',
      'asb', 'asc', 'asd', 'asf', 'asg', 'ash', 'asj', 'ask', 'asl', 'asm', 'asn', 'asp', 'asr', 'ast', 'asv', 'asw', 'asx', 'asy', 'asz',
      'atb', 'atc', 'atd', 'atf', 'atg', 'ath', 'atj', 'atk', 'atl', 'atm', 'atn', 'atp', 'atr', 'ats', 'att', 'atv', 'atw', 'atx', 'aty', 'atz',
      'avb', 'avc', 'avd', 'avf', 'avg', 'avh', 'avj', 'avk', 'avl', 'avm', 'avn', 'avp', 'avr', 'avs', 'avt', 'avv', 'avw', 'avx', 'avy', 'avz',
      'awb', 'awc', 'awd', 'awf', 'awg', 'awh', 'awj', 'awk', 'awl', 'awm', 'awn', 'awp', 'awr', 'aws', 'awt', 'awv', 'aww', 'awx', 'awy', 'awz'
    ]
  };

  // Get the pool for the current difficulty
  const pool = trulyRandomPools[difficulty];
  
  // Use crypto random for even better randomness
  const getRandomIndex = () => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % pool.length;
  };
  
  // Select purely random syllable - no filtering, no memory, no patterns
  const randomIndex = getRandomIndex();
  const selectedSyllable = pool[randomIndex];
  
  console.log(`Selected TRULY RANDOM syllable: "${selectedSyllable}" from index ${randomIndex} of ${pool.length} total options`);
  console.log(`Random index calculation: crypto random % ${pool.length} = ${randomIndex}`);
  
  return selectedSyllable;
};
