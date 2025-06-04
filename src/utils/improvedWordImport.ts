
import { supabase } from '@/integrations/supabase/client';

// Enhanced word sources with better Danish word lists
const ENHANCED_WORD_SOURCES = [
  // Core Danish dictionaries
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  
  // Additional comprehensive sources
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/da/index.dic',
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.dic',
  
  // Frequency-based word lists
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
  'https://raw.githubusercontent.com/stopwords-iso/stopwords-da/master/raw/stopwords-da.txt'
];

const fetchWordsFromUrl = async (url: string): Promise<{ words: string[], source: string }> => {
  console.log(`Fetching words from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WordImporter/1.0)'
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
        let word = line;
        
        // Tab-separated format (lemmatization files)
        if (line.includes('\t')) {
          word = line.split('\t')[0];
        }
        
        // Dictionary format with slashes or other separators
        if (line.includes('/')) {
          word = line.split('/')[0];
        }
        
        // Frequency lists (word count format)
        if (/^\d+\s+/.test(line)) {
          word = line.replace(/^\d+\s+/, '');
        }
        
        // Remove any remaining special characters and clean up
        word = word.replace(/[^a-zæøå]/gi, '').toLowerCase().trim();
        
        return word;
      })
      .filter(word => 
        word.length > 0 && 
        word.length >= 2 && 
        word.length <= 25 &&
        /^[a-zæøå]+$/.test(word) && // Only Danish letters
        // Exclude obvious non-words
        !word.match(/^[aeiouæøå]+$/) && // Not just vowels
        !word.match(/^[bcdfghjklmnpqrstvwxz]+$/) // Not just consonants
      );
    
    console.log(`Fetched ${words.length} valid words from ${url}`);
    return { words, source: url };
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
