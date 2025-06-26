
import { supabase } from '@/integrations/supabase/client';

// Udvidede danske ordkilder med fokus på bøjninger og større ordlister
const EXPANDED_WORD_SOURCES = [
  // Eksisterende kilder
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  
  // Nye kilder med bøjninger
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
  
  // Open-source danske ordbøger
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.dic',
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/da/index.dic',
  
  // Grammatiske former og bøjninger
  'https://raw.githubusercontent.com/stopwords-iso/stopwords-da/master/raw/stopwords-da.txt'
];

const fetchExpandedWords = async (url: string): Promise<{ words: string[], source: string }> => {
  console.log(`Fetching expanded Danish words from: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DanishWordExpander/1.0)'
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
        let word = line;
        
        // Håndter forskellige filformater
        if (line.includes('\t')) {
          // Lemmatization filer: "ordet\tgrunform\twordclass"
          const parts = line.split('\t');
          return parts.slice(0, 2); // Tag både bøjet form og grundform
        }
        
        // Frekvensbaserede lister
        if (/^\d+\s+/.test(line)) {
          word = line.replace(/^\d+\s+/, '');
        }
        
        // Dictionary format
        if (line.includes('/')) {
          const parts = line.split('/');
          word = parts[0];
          // Tag også alternative former hvis de findes
          if (parts.length > 1) {
            return [word, ...parts.slice(1).map(p => p.split(/[^a-zæøå]/i)[0])];
          }
        }
        
        word = word.replace(/[^a-zæøå]/gi, '').toLowerCase().trim();
        return [word];
      })
      .flat()
      .filter(word => 
        word && 
        word.length >= 2 && 
        word.length <= 30 &&
        /^[a-zæøå]+$/.test(word) &&
        !word.match(/^[aeiouæøå]+$/) &&
        !word.match(/^[bcdfghjklmnpqrstvwxz]+$/)
      );
    
    console.log(`Fetched ${words.length} expanded words from ${url}`);
    return { words, source: url };
  } catch (error) {
    console.error(`Error fetching expanded words from ${url}:`, error);
    return { words: [], source: url };
  }
};

export const importExpandedDanishWords = async () => {
  console.log('Starting expanded Danish word import with inflections...');
  
  const allWords = new Set<string>();
  const sourceStats: Record<string, number> = {};
  
  // Hent ord fra alle kilder
  for (const url of EXPANDED_WORD_SOURCES) {
    try {
      const { words, source } = await fetchExpandedWords(url);
      sourceStats[source] = words.length;
      words.forEach(word => allWords.add(word));
      
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to process expanded source ${url}:`, error);
    }
  }
  
  console.log('Expanded source statistics:', sourceStats);
  console.log(`Total unique words with inflections: ${allWords.size}`);
  
  // Import i batches
  const uniqueWords = Array.from(allWords).sort();
  const batchSize = 400;
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
        console.error('Expanded batch import error:', error);
        errors += batch.length;
      } else {
        imported += batch.length;
        const progress = Math.round((i / uniqueWords.length) * 100);
        console.log(`Expanded import progress: ${progress}%`);
      }
    } catch (err) {
      console.error('Unexpected expanded batch error:', err);
      errors += batch.length;
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`Expanded import complete. Imported: ${imported}, Errors: ${errors}`);
  
  return { 
    imported, 
    errors, 
    totalSources: EXPANDED_WORD_SOURCES.length,
    sourceStats 
  };
};
