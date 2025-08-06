
import { supabase } from '@/integrations/supabase/client';

// Enhanced word sources with better Danish word lists
const ENHANCED_WORD_SOURCES = [
  // Core Danish dictionaries
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  
  // LibreOffice dictionaries (comprehensive)
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.dic',
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/da/index.dic',
  
  // Lemmatization and frequency lists
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
  'https://raw.githubusercontent.com/stopwords-iso/stopwords-da/master/raw/stopwords-da.txt',
  
  // Additional comprehensive Danish sources
  'https://raw.githubusercontent.com/danish-language-technology/danish-sentiment-lexicon/master/word-lists/positive-words-da.txt',
  'https://raw.githubusercontent.com/danish-language-technology/danish-sentiment-lexicon/master/word-lists/negative-words-da.txt',
  'https://raw.githubusercontent.com/fnielsen/afinn/master/afinn/data/AFINN-da-32.txt',
  
  // Wikipedia Danish word lists
  'https://raw.githubusercontent.com/attardi/wikiextractor/master/lemmatization-da.txt',
  
  // Morphological Danish dictionaries
  'https://raw.githubusercontent.com/alexandrainst/danish-named-entity-recognition/main/data/danish_words.txt'
];

const fetchWordsFromUrl = async (url: string): Promise<{ words: string[], source: string }> => {
  console.log(`Fetching words from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WordImporter/1.0)',
        'Accept': 'text/plain, application/octet-stream, */*'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch from ${url}: ${response.status}`);
      return { words: [], source: url };
    }
    
    const text = await response.text();
    const words = text
      .split(/[\n\r]+/)
      .map(line => {
        // Handle different file formats
        let word = line.trim();
        
        // Skip empty lines and comments
        if (!word || word.startsWith('#') || word.startsWith('//')) {
          return '';
        }
        
        // Tab-separated format (lemmatization files)
        if (word.includes('\t')) {
          const parts = word.split('\t');
          // Take the base form (first column) or lemma form
          word = parts[0] || parts[1] || '';
        }
        
        // Dictionary format with slashes or other separators
        if (word.includes('/')) {
          word = word.split('/')[0];
        }
        
        // Frequency lists (word count format like "1000 word")
        if (/^\d+\s+/.test(word)) {
          word = word.replace(/^\d+\s+/, '');
        }
        
        // AFINN format (word score format like "word score")
        if (/\s-?\d+$/.test(word)) {
          word = word.replace(/\s-?\d+$/, '');
        }
        
        // LibreOffice .dic format (remove flags like "word/AB")
        if (word.includes('/') && word.match(/\/[A-Z]+$/)) {
          word = word.replace(/\/[A-Z]+$/, '');
        }
        
        // Remove any remaining special characters and clean up
        word = word.replace(/[^a-zæøåA-ZÆØÅ]/g, '').toLowerCase().trim();
        
        return word;
      })
      .filter(word => 
        word.length > 0 && 
        word.length >= 2 && 
        word.length <= 30 && // Allow slightly longer words for compound words
        /^[a-zæøå]+$/.test(word) && // Only Danish letters
        // Exclude obvious non-words
        !word.match(/^[aeiouæøå]+$/) && // Not just vowels
        !word.match(/^[bcdfghjklmnpqrstvwxz]+$/) && // Not just consonants
        // Include compound words that might have been excluded
        word.length <= 25 || (word.includes('gård') || word.includes('hus') || word.includes('arbejd'))
      );
    
    // Remove duplicates at source level
    const uniqueWords = [...new Set(words)];
    
    console.log(`Fetched ${uniqueWords.length} valid unique words from ${url}`);
    return { words: uniqueWords, source: url };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return { words: [], source: url };
  }
};

export const importEnhancedWords = async () => {
  console.log('Starting enhanced Danish word import...');
  
  const allWords = new Set<string>();
  const sourceStats: Record<string, number> = {};
  
  // Fetch words from all sources with better error handling
  for (const url of ENHANCED_WORD_SOURCES) {
    try {
      const { words, source } = await fetchWordsFromUrl(url);
      sourceStats[source] = words.length;
      words.forEach(word => allWords.add(word));
      
      // Add small delay to be respectful to servers
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.error(`Failed to process source ${url}:`, error);
    }
  }
  
  console.log('Source statistics:', sourceStats);
  console.log(`Total unique words collected: ${allWords.size}`);
  
  // Convert to sorted array
  const uniqueWords = Array.from(allWords).sort();
  
  // Import in optimized batches
  const batchSize = 500; // Smaller batches for better reliability
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
            frequency_rank: i + index + 1 // Approximate frequency ranking
          })),
          { 
            onConflict: 'word',
            ignoreDuplicates: true
          }
        );

      if (error) {
        console.error('Batch import error:', error);
        errors += batch.length;
      } else {
        imported += batch.length;
        const progress = Math.round((i / uniqueWords.length) * 100);
        console.log(`Progress: ${progress}% - Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueWords.length / batchSize)}`);
      }
    } catch (err) {
      console.error('Unexpected batch error:', err);
      errors += batch.length;
    }
    
    // Throttle requests
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`Enhanced import complete. Imported: ${imported}, Errors: ${errors}`);
  console.log('Source breakdown:', sourceStats);
  
  return { 
    imported, 
    errors, 
    totalSources: ENHANCED_WORD_SOURCES.length,
    sourceStats 
  };
};
