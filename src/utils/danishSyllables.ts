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

// Keep track of syllables used in current game session
let currentGameSyllables: string[] = [];
let usedSyllablesInGame: Set<string> = new Set();

export const resetGameSyllables = () => {
  console.log('Resetting game syllables for new game session');
  currentGameSyllables = [...DANISH_SYLLABLES];
  usedSyllablesInGame = new Set();
  
  // Shuffle the syllables for this game session
  for (let i = currentGameSyllables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentGameSyllables[i], currentGameSyllables[j]] = [currentGameSyllables[j], currentGameSyllables[i]];
  }
  
  console.log(`Game session initialized with ${currentGameSyllables.length} shuffled syllables`);
};

export const getRandomDanishSyllable = (): string => {
  // Initialize if not done yet
  if (currentGameSyllables.length === 0) {
    resetGameSyllables();
  }
  
  // Find available syllables (not used in this game yet)
  const availableSyllables = currentGameSyllables.filter(s => !usedSyllablesInGame.has(s));
  
  // If we've used all syllables, reset the used set but keep the shuffled order
  if (availableSyllables.length === 0) {
    console.log('All syllables used, allowing reuse but maintaining variety');
    usedSyllablesInGame.clear();
    // Only allow reuse of syllables used more than 10 rounds ago
    const recentlyUsed = Array.from(usedSyllablesInGame).slice(-10);
    const syllablesForReuse = currentGameSyllables.filter(s => !recentlyUsed.includes(s));
    
    if (syllablesForReuse.length > 0) {
      availableSyllables.push(...syllablesForReuse);
    } else {
      // Fallback: use all syllables again
      availableSyllables.push(...currentGameSyllables);
    }
  }
  
  // Select random syllable from available ones
  const randomIndex = Math.floor(Math.random() * availableSyllables.length);
  const selectedSyllable = availableSyllables[randomIndex];
  
  // Mark as used in this game
  usedSyllablesInGame.add(selectedSyllable);
  
  console.log(`Selected syllable: "${selectedSyllable}" from ${availableSyllables.length} available options`);
  console.log(`Used syllables in game: ${usedSyllablesInGame.size}/${DANISH_SYLLABLES.length}`);
  
  return selectedSyllable;
};
