import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced word sources for comprehensive Danish word lists
const ENHANCED_WORD_SOURCES = [
  'https://raw.githubusercontent.com/LibreOffice/dictionaries/master/da_DK/da_DK.dic',
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/da/index.dic',
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/da/da_50k.txt',
  'https://raw.githubusercontent.com/n0kovo/danish-wordlists/main/danish_wordlist.txt',
  'https://raw.githubusercontent.com/n0kovo/danish-wordlists/main/danish_dictionary.txt',
  'https://raw.githubusercontent.com/fraabye/Danish-wordlists/master/Danish-wordlist-combined.txt',
  'https://raw.githubusercontent.com/fraabye/Danish-wordlists/master/Danish-simple.txt',
  'https://raw.githubusercontent.com/fraabye/Danish-wordlists/master/Danish-top20k.txt',
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt'
];

const STANDARD_WORD_SOURCES = [
  'https://raw.githubusercontent.com/martinlindhe/wordlists/master/20200419-Danish-words.txt',
  'https://raw.githubusercontent.com/hingston/danish-words/main/danish-words.txt',
  'https://raw.githubusercontent.com/michmech/lemmatization-lists/master/lemmatization-da.txt',
  'https://raw.githubusercontent.com/titoBouzout/Dictionaries/master/Danish.dic'
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
        let word = line.trim();
        
        if (!word || word.startsWith('#') || word.startsWith('//')) {
          return '';
        }
        
        // Handle CSV format
        if (url.includes('.csv')) {
          const parts = word.split(',');
          word = parts[0].replace(/['"]/g, '').trim();
        }
        
        // Tab-separated format
        if (word.includes('\t')) {
          const parts = word.split('\t');
          word = parts[0] || parts[1] || '';
        }
        
        // Dictionary format with slashes
        if (word.includes('/')) {
          word = word.split('/')[0];
        }
        
        // Frequency lists (number word format)
        if (/^\d+\s+/.test(word)) {
          word = word.replace(/^\d+\s+/, '');
        }
        
        // AFINN format (word score format)
        if (/\s-?\d+$/.test(word)) {
          word = word.replace(/\s-?\d+$/, '');
        }
        
        // LibreOffice .dic format
        if (word.includes('/') && word.match(/\/[A-Z]+$/)) {
          word = word.replace(/\/[A-Z]+$/, '');
        }
        
        word = word.replace(/[^a-zæøåA-ZÆØÅ]/g, '').toLowerCase().trim();
        
        return word;
      })
      .filter(word => 
        word.length > 0 && 
        word.length >= 2 && 
        word.length <= 25 &&
        /^[a-zæøå]+$/.test(word) &&
        !word.match(/^[aeiouæøå]+$/) &&
        !word.match(/^[bcdfghjklmnpqrstvwxz]+$/)
      );
    
    const uniqueWords = [...new Set(words)];
    console.log(`Fetched ${uniqueWords.length} valid unique words from ${url}`);
    return { words: uniqueWords, source: url };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return { words: [], source: url };
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'enhanced', stream = false } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If streaming is requested, use Server-Sent Events
    if (stream) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          
          const sendUpdate = (data: any) => {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          const processImport = async () => {
            try {
              console.log(`Starting ${type} word import process...`);
              sendUpdate({ type: 'start', message: `Starting ${type} import...` });
              
              const sources = type === 'enhanced' ? ENHANCED_WORD_SOURCES : STANDARD_WORD_SOURCES;
              const allWords = new Set<string>();
              const sourceStats: Record<string, number> = {};
              
              // Phase 1: Fetch words from sources
              sendUpdate({ type: 'phase', phase: 1, total: 2, message: 'Fetching words from sources...' });
              
              for (let i = 0; i < sources.length; i++) {
                const url = sources[i];
                try {
                  sendUpdate({ 
                    type: 'progress', 
                    phase: 1,
                    current: i + 1, 
                    total: sources.length, 
                    message: `Fetching from source ${i + 1}/${sources.length}...`,
                    url: new URL(url).hostname
                  });
                  
                  const { words, source } = await fetchWordsFromUrl(url);
                  sourceStats[source] = words.length;
                  words.forEach(word => allWords.add(word));
                  
                  await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                  console.error(`Failed to process source ${url}:`, error);
                  sendUpdate({ type: 'error', message: `Failed to fetch from ${new URL(url).hostname}` });
                }
              }
              
              console.log(`Total unique words collected: ${allWords.size}`);
              sendUpdate({ type: 'phase', phase: 2, total: 2, message: `Processing ${allWords.size} unique words...` });
              
              // Phase 2: Import to database
              const uniqueWords = Array.from(allWords).sort();
              const batchSize = 500;
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
                    console.error('Batch import error:', error);
                    errors += batch.length;
                  } else {
                    imported += batch.length;
                    const progress = Math.round((i / uniqueWords.length) * 100);
                    
                    sendUpdate({ 
                      type: 'progress', 
                      phase: 2,
                      current: imported, 
                      total: uniqueWords.length, 
                      percentage: progress,
                      message: `Imported ${imported.toLocaleString()}/${uniqueWords.length.toLocaleString()} words (${progress}%)`
                    });
                  }
                } catch (err) {
                  console.error('Unexpected batch error:', err);
                  errors += batch.length;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
              }

              console.log(`Import complete. Imported: ${imported}, Errors: ${errors}`);
              
              sendUpdate({ 
                type: 'complete', 
                imported, 
                errors, 
                totalSources: sources.length,
                sourceStats 
              });
              
              controller.close();
            } catch (error) {
              sendUpdate({ type: 'error', message: error.message });
              controller.close();
            }
          };

          processImport();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Original non-streaming version for compatibility
    console.log(`Starting ${type} word import process...`);
    
    const sources = type === 'enhanced' ? ENHANCED_WORD_SOURCES : STANDARD_WORD_SOURCES;
    const allWords = new Set<string>();
    const sourceStats: Record<string, number> = {};
    
    // Fetch words from all sources
    for (const url of sources) {
      try {
        const { words, source } = await fetchWordsFromUrl(url);
        sourceStats[source] = words.length;
        words.forEach(word => allWords.add(word));
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to process source ${url}:`, error);
      }
    }
    
    console.log(`Total unique words collected: ${allWords.size}`);
    
    // Convert to sorted array
    const uniqueWords = Array.from(allWords).sort();
    
    // Import in batches
    const batchSize = 500;
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Import complete. Imported: ${imported}, Errors: ${errors}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imported, 
        errors, 
        totalSources: sources.length,
        sourceStats 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});