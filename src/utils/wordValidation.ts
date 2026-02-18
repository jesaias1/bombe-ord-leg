
import { supabase } from '@/integrations/supabase/client';

export const validateWord = async (word: string, syllable: string): Promise<boolean> => {
  if (!word || !syllable) return false;
  
  const trimmedWord = word.toLowerCase().trim();
  const trimmedSyllable = syllable.toLowerCase().trim();
  
  console.log(`Validating word: "${trimmedWord}" contains syllable: "${trimmedSyllable}"`);
  
  // Check if word contains the syllable
  if (!trimmedWord.includes(trimmedSyllable)) {
    console.log(`Word "${trimmedWord}" does not contain syllable "${trimmedSyllable}"`);
    return false;
  }

  // Check if word exists in database
  const { data, error } = await supabase
    .from('danish_words')
    .select('word')
    .eq('word', trimmedWord)
    .single();

  if (error || !data) {
    console.log(`Word "${trimmedWord}" not found in database`);
    return false;
  }

  console.log(`Word "${trimmedWord}" is valid!`);
  return true;
};
