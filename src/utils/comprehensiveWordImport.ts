
import { supabase } from '@/integrations/supabase/client';

// Comprehensive Danish word sources with focus on common everyday words
const COMPREHENSIVE_WORD_SOURCES = [
  // Core Danish dictionaries
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  
  // Enhanced Danish word collections
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/da/index.dic',
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.dic',
  
  // Additional comprehensive sources
  'https://raw.githubusercontent.com/stopwords-iso/stopwords-da/master/raw/stopwords-da.txt',
  'https://raw.githubusercontent.com/titoBouzout/Dictionaries/master/Danish.dic',
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.aff'
];

// Essential missing words that should always be included
const ESSENTIAL_MISSING_WORDS = [
  // Adverbs and intensifiers
  'sindssygt', 'sindssyg', 'sindsyg', 'vanvittigt', 'vanvittig', 'vildt', 'vild', 'mega',
  'super', 'ultra', 'ekstra', 'helt', 'rigtig', 'virkelig', 'særlig', 'specielt',
  
  // Common adjectives and their forms
  'fed', 'fede', 'cool', 'sej', 'sejt', 'seje', 'nice', 'lækker', 'lækkert', 'lækre',
  'crazy', 'skør', 'skørt', 'skøre', 'tosset', 'tosse', 'vanvittig', 'vanvittigt',
  
  // Slang and informal words
  'fuck', 'shit', 'pis', 'lort', 'skide', 'fanden', 'helvede', 'pokker',
  'damn', 'dæmme', 'fandme', 'satme', 'kraftedme',
  
  // Modern words and anglicisms
  'okay', 'ok', 'hey', 'hej', 'yo', 'wow', 'omg', 'wtf', 'lol',
  'app', 'apps', 'smartphone', 'tablet', 'laptop', 'computer',
  
  // Food and everyday items
  'pizza', 'burger', 'hotdog', 'sandwich', 'pasta', 'sushi',
  'kaffe', 'øl', 'ølle', 'cola', 'sodavand', 'juice',
  
  // Body parts and common words
  'krop', 'kroppe', 'hoved', 'hoveder', 'ansigt', 'ansigter',
  'øje', 'øjne', 'mund', 'munde', 'næse', 'næser',
  
  // Emotions and states
  'glad', 'glade', 'trist', 'triste', 'sur', 'sure', 'vred', 'vrede',
  'lykkelig', 'lykkelige', 'kærlig', 'kærlige', 'elsker', 'elsket',
  
  // Actions and verbs with inflections
  'spise', 'spiser', 'spiste', 'spist', 'drikke', 'drikker', 'drak', 'drukket',
  'løbe', 'løber', 'løb', 'løbet', 'gå', 'går', 'gik', 'gået',
  'køre', 'kører', 'kørte', 'kørt', 'flyve', 'flyver', 'fløj', 'fløjet'
];

const generateComprehensiveInflections = (baseWord: string): string[] => {
  const inflections = [baseWord];
  
  // Substantiver - alle former
  const nounInflections = [
    baseWord + 'en',     // bestemt ental
    baseWord + 'et',     // bestemt ental neutrum
    baseWord + 'erne',   // bestemt flertal
    baseWord + 'ene',    // bestemt flertal efter konsonant
    baseWord + 'er',     // ubestemt flertal
    baseWord + 'e',      // ubestemt flertal/bøjning
    baseWord + 's',      // genitiv
    baseWord + 'ens',    // genitiv bestemt
    baseWord + 'ets',    // genitiv bestemt neutrum
    baseWord + 'ers',    // genitiv flertal
    baseWord + 'ernes',  // genitiv bestemt flertal
    baseWord + 'enes'    // genitiv bestemt flertal
  ];
  
  // Verber - alle former
  const verbInflections = [
    baseWord + 'r',      // nutid
    baseWord + 'er',     // nutid
    baseWord + 'ede',    // datid svag
    baseWord + 'te',     // datid svag
    baseWord + 'de',     // datid svag
    baseWord + 'et',     // førnutid
    baseWord + 't',      // førnutid
    baseWord + 'ende',   // nutids tillægsform
    baseWord + 'ende'    // gerundium
  ];
  
  // Adjektiver - alle former
  const adjectiveInflections = [
    baseWord + 'e',      // fælles form/pluralis
    baseWord + 't',      // neutrum
    baseWord + 'ere',    // komparativ
    baseWord + 'est',    // superlativ
    baseWord + 'este'    // superlativ bestemt
  ];
  
  // Tilføj alle bøjninger
  inflections.push(...nounInflections, ...verbInflections, ...adjectiveInflections);
  
  // Håndter ord der ender på 'e'
  if (baseWord.endsWith('e')) {
    const stem = baseWord.slice(0, -1);
    inflections.push(
      stem,            // grundform uden e
      stem + 'en',     // bestemt form
      stem + 'er',     // flertal
      stem + 'erne',   // bestemt flertal
      stem + 'ede',    // datid
      stem + 'et',     // førnutid
      stem + 'ende'    // tillægsform
    );
  }
  
  // Håndter dobbeltkonsonanter
  const lastChar = baseWord.slice(-1);
  const secondLastChar = baseWord.slice(-2, -1);
  if (lastChar === secondLastChar && 'bcdfghjklmnpqrstvwxz'.includes(lastChar)) {
    const stemWithoutDouble = baseWord.slice(0, -1);
    inflections.push(
      stemWithoutDouble + 'e',
      stemWithoutDouble + 'er',
      stemWithoutDouble + 'et'
    );
  }
  
  return inflections.filter(word => 
    word.length >= 2 && 
    word.length <= 30 &&
    /^[a-zæøå]+$/i.test(word)
  );
};

const fetchComprehensiveWords = async (url: string): Promise<{ words: string[], source: string }> => {
  console.log(`Fetching comprehensive words from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ComprehensiveWordImporter/1.0)' }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch from ${url}: ${response.status}`);
      return { words: [], source: url };
    }
    
    const text = await response.text();
    const baseWords = text
      .split(/[\n\r]+/)
      .map(line => {
        let word = line.trim();
        
        // Handle various formats
        if (line.includes('\t')) {
          const parts = line.split('\t');
          return parts.slice(0, 2).flat();
        }
        
        if (/^\d+\s+/.test(line)) {
          word = line.replace(/^\d+\s+/, '');
        }
        
        if (line.includes('/')) {
          const parts = line.split('/');
          word = parts[0];
          if (parts.length > 1) {
            return [word, ...parts.slice(1).map(p => p.split(/[^a-zæøå]/i)[0])];
          }
        }
        
        word = word.replace(/[^a-zæøå]/gi, '').toLowerCase();
        return [word];
      })
      .flat()
      .filter(word => 
        word && 
        word.length >= 2 && 
        word.length <= 25 &&
        /^[a-zæøå]+$/.test(word)
      );
    
    // Generate comprehensive inflections
    const allWords = new Set<string>();
    
    // Add essential missing words first
    ESSENTIAL_MISSING_WORDS.forEach(word => {
      const inflections = generateComprehensiveInflections(word.toLowerCase());
      inflections.forEach(w => allWords.add(w));
    });
    
    // Add words from source with inflections
    for (const baseWord of baseWords) {
      const inflections = generateComprehensiveInflections(baseWord);
      inflections.forEach(word => allWords.add(word));
    }
    
    const finalWords = Array.from(allWords);
    console.log(`Generated ${finalWords.length} comprehensive words from ${baseWords.length} base words from ${url}`);
    return { words: finalWords, source: url };
  } catch (error) {
    console.error(`Error fetching comprehensive words from ${url}:`, error);
    return { words: [], source: url };
  }
};

export const importComprehensiveWords = async () => {
  console.log('Starting comprehensive Danish word import with missing common words...');
  
  const allWords = new Set<string>();
  const sourceStats: Record<string, number> = {};
  
  // First, add essential missing words
  console.log('Adding essential missing words...');
  ESSENTIAL_MISSING_WORDS.forEach(word => {
    const inflections = generateComprehensiveInflections(word.toLowerCase());
    inflections.forEach(w => allWords.add(w));
  });
  console.log(`Added ${allWords.size} essential words with inflections`);
  
  // Then fetch from all sources
  for (const url of COMPREHENSIVE_WORD_SOURCES) {
    try {
      const { words, source } = await fetchComprehensiveWords(url);
      sourceStats[source] = words.length;
      words.forEach(word => allWords.add(word));
      
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to process comprehensive source ${url}:`, error);
    }
  }
  
  console.log('Comprehensive source statistics:', sourceStats);
  console.log(`Total unique words with comprehensive coverage: ${allWords.size}`);
  
  // Import in batches
  const uniqueWords = Array.from(allWords).sort();
  const batchSize = 250;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('danish_words')
        .upsert(
          batch.map((word, index) => ({ 
            word: word.toLowerCase().trim(),
            frequency_rank: i + index + 1
          })),
          { 
            onConflict: 'word',
            ignoreDuplicates: true
          }
        );

      if (error) {
        console.error('Comprehensive batch import error:', error);
        errors += batch.length;
      } else {
        imported += batch.length;
        const progress = Math.round((i / uniqueWords.length) * 100);
        console.log(`Comprehensive import progress: ${progress}% - ${imported} words imported`);
      }
    } catch (err) {
      console.error('Unexpected comprehensive batch error:', err);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`Comprehensive import complete. Imported: ${imported}, Errors: ${errors}`);
  
  return { 
    imported, 
    errors, 
    totalSources: COMPREHENSIVE_WORD_SOURCES.length,
    sourceStats,
    essentialWordsAdded: ESSENTIAL_MISSING_WORDS.length
  };
};
