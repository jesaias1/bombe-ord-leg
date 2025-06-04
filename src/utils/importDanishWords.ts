
import { supabase } from '@/integrations/supabase/client';

// GitHub URLs for comprehensive Danish word lists
const WORD_LIST_URLS = [
  // Main Danish words list
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  // Additional Danish words
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  // More comprehensive lists
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  // Backup sources
  'https://raw.githubusercontent.com/titoBouzout/Dictionaries/master/Danish.dic'
];

const fetchWordsFromUrl = async (url: string): Promise<string[]> => {
  console.log(`Fetching words from: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch from ${url}: ${response.status}`);
      return [];
    }
    
    const text = await response.text();
    const words = text
      .split('\n')
      .map(line => {
        // Handle different file formats
        if (line.includes('\t')) {
          // Tab-separated format (lemmatization files)
          return line.split('\t')[0];
        }
        if (line.includes('/')) {
          // Dictionary format with slashes
          return line.split('/')[0];
        }
        return line;
      })
      .map(word => word.trim().toLowerCase())
      .filter(word => 
        word.length > 0 && 
        word.length >= 2 && 
        word.length <= 20 &&
        /^[a-zæøå]+$/.test(word) && // Only Danish letters
        !word.includes(' ') &&
        !word.includes('-') &&
        !word.includes('.') &&
        !word.includes(',')
      );
    
    console.log(`Fetched ${words.length} valid words from ${url}`);
    return words;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return [];
  }
};

export const importAllWords = async () => {
  console.log('Starting comprehensive Danish word import from GitHub sources...');
  
  let allWords: Set<string> = new Set();
  let totalFetched = 0;
  
  // Fetch words from all sources
  for (const url of WORD_LIST_URLS) {
    const words = await fetchWordsFromUrl(url);
    totalFetched += words.length;
    words.forEach(word => allWords.add(word));
  }
  
  console.log(`Total unique words collected: ${allWords.size} from ${totalFetched} total words`);
  
  // Convert to array and sort
  const uniqueWords = Array.from(allWords).sort();
  
  // Import in batches
  const batchSize = 1000;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('danish_words')
        .upsert(
          batch.map(word => ({ word: word.toLowerCase().trim() })),
          { onConflict: 'word' }
        );

      if (error) {
        console.error('Batch import error:', error);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueWords.length / batchSize)}, total words: ${imported}`);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      errors += batch.length;
    }
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Import complete. Imported: ${imported}, Errors: ${errors}`);
  return { imported, errors };
};
