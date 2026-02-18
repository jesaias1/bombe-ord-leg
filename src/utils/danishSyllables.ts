
// Comprehensive list of Danish syllables for the Bomb Party game
export const DANISH_SYLLABLES = [
  // Common 2-letter combinations
  'an', 'ar', 'at', 'av', 'ad', 'af', 'ag', 'ak', 'al', 'am', 'as',
  'ba', 'be', 'bi', 'bo', 'bu', 'by', 'bl', 'br',
  'da', 'de', 'di', 'do', 'du', 'dy', 'dr',
  'en', 'er', 'et', 'el', 'ed', 'ef', 'eg', 'ek', 'em', 'es',
  'fa', 'fe', 'fi', 'fo', 'fu', 'fy', 'fl', 'fr',
  'ga', 'ge', 'gi', 'go', 'gu', 'gy', 'gl', 'gr',
  'ha', 'he', 'hi', 'ho', 'hu', 'hy',
  'in', 'ir', 'it', 'id', 'ig', 'ik', 'il', 'im', 'is',
  'ja', 'je', 'jo', 'ju',
  'ka', 'ke', 'ki', 'ko', 'ku', 'ky', 'kl', 'kr',
  'la', 'le', 'li', 'lo', 'lu', 'ly',
  'ma', 'me', 'mi', 'mo', 'mu', 'my',
  'na', 'ne', 'ni', 'no', 'nu', 'ny',
  'on', 'or', 'ot', 'ov', 'od', 'of', 'og', 'ok', 'ol', 'om', 'op', 'os',
  'pa', 'pe', 'pi', 'po', 'pu', 'py', 'pl', 'pr',
  'ra', 're', 'ri', 'ro', 'ru', 'ry',
  'sa', 'se', 'si', 'so', 'su', 'sy', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sv',
  'ta', 'te', 'ti', 'to', 'tu', 'ty', 'tr',
  'un', 'ur', 'ut', 'ud', 'uf', 'ug', 'uk', 'ul', 'um', 'up', 'us',
  'va', 've', 'vi', 'vo', 'vu', 'vy',
  'wa', 'we', 'wi', 'wo', 'wu',
  'ya', 'ye', 'yi', 'yo', 'yu',
  
  // Danish specific letters and combinations
  'æg', 'æt', 'ær', 'æl', 'æn', 'æd', 'æs',
  'øg', 'øj', 'øl', 'øn', 'ør', 'øs', 'øv',
  'åg', 'ål', 'ån', 'år', 'ås', 'åt',
  
  // Common 3-letter combinations that are frequent in Danish
  'and', 'ing', 'der', 'ter', 'sen', 'den', 'hed', 'ker', 'ger',
  'ste', 'str', 'sko', 'spr', 'skr', 'gra', 'tra', 'bra', 'fra',
  'kra', 'pra', 'dra', 'tre', 'bre', 'fre', 'gre', 'pre', 'kre',
  'ble', 'fle', 'gle', 'ple', 'kle', 'sle',
  'lov', 'hov', 'rov', 'tov', 'nov',
  'led', 'red', 'sed', 'ved', 'bed', 'fed', 'ked', 'med', 'ned',
  'lig', 'rig', 'sig', 'tig', 'big', 'dig', 'fig', 'mig', 'pig',
  'lan', 'ran', 'san', 'tan', 'van', 'ban', 'dan', 'fan', 'gan', 'han', 'kan', 'man', 'pan',
  'lag', 'rag', 'sag', 'tag', 'vag', 'bag', 'dag', 'fag', 'gag', 'hag', 'kag', 'mag', 'pag',
  'lin', 'rin', 'sin', 'tin', 'vin', 'bin', 'din', 'fin', 'gin', 'hin', 'kin', 'min', 'pin',
  'lus', 'rus', 'sus', 'tus', 'vus', 'bus', 'dus', 'fus', 'gus', 'hus', 'kus', 'mus', 'pus',
  'len', 'ren', 'ten', 'ven', 'ben', 'den', 'fen', 'gen', 'hen', 'ken', 'men', 'pen',
  'lok', 'rok', 'sok', 'tok', 'vok', 'bok', 'dok', 'fok', 'gok', 'hok', 'kok', 'mok', 'pok',
  'lyd', 'ryd', 'syd', 'tyd', 'vyd', 'byd', 'dyd', 'fyd', 'gyd', 'hyd', 'kyd', 'myd', 'pyd'
];

// Deprecated: This function is no longer needed as syllables are now managed by the database
export const resetGameSyllables = () => {
  console.log('resetGameSyllables is deprecated - syllables are now managed by the database');
};

// Deprecated: This function is no longer needed as syllables are now managed by the database
export const getRandomDanishSyllable = (): string => {
  console.log('getRandomDanishSyllable is deprecated - use game syllables from database instead');
  return DANISH_SYLLABLES[Math.floor(Math.random() * DANISH_SYLLABLES.length)];
};
