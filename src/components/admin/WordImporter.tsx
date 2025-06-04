
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { importAllWords } from '@/utils/importDanishWords';
import { ensureBasicWords } from '@/utils/ensureBasicWords';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const WordImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  // Check if user is admin by checking email directly (simplified approach)
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      // Only specific admin email
      return user.email === 'lin4s@live.dk';
    }
  });

  // Get word count
  const { data: wordCount = 0 } = useQuery({
    queryKey: ['word-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      // First ensure basic words are available
      await ensureBasicWords();
      
      // Then import comprehensive word lists from GitHub
      const result = await importAllWords();
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({ imported: 0, errors: 1 });
    } finally {
      setIsImporting(false);
    }
  };

  const clearWords = async () => {
    if (!confirm('Er du sikker på at du vil slette alle ord? Dette kan ikke fortrydes.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('danish_words')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error clearing words:', error);
      } else {
        setImportResult({ imported: 0, errors: 0 });
        window.location.reload();
      }
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ordimporter</CardTitle>
          <CardDescription>Kun administratorer kan importere ord</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dansk Ord Importer</CardTitle>
        <CardDescription>
          Importer omfattende danske ordlister fra GitHub repositories.
          Aktuelt antal ord i databasen: {wordCount.toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={handleImport} 
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? 'Importerer...' : 'Start Import'}
          </Button>
          <Button 
            onClick={clearWords} 
            variant="destructive"
            disabled={isImporting}
          >
            Ryd Alle Ord
          </Button>
        </div>
        
        {isImporting && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-gray-600">Importerer ord fra GitHub repositories...</p>
          </div>
        )}
        
        {importResult && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Import Resultat:</h3>
            <p>Importerede ord: {importResult.imported.toLocaleString()}</p>
            <p>Fejl: {importResult.errors}</p>
            {importResult.imported > 0 && (
              <p className="text-green-600 font-medium">Import gennemført succesfuldt!</p>
            )}
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Omfattende danske ordlister fra GitHub:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>20200419-Danish-words.txt - Grundlæggende danske ord</li>
            <li>danish-words.txt - Supplerende ordliste</li>
            <li>lemmatization-da.txt - Lemmatiserede danske ord</li>
            <li>Danish.dic - Ordbogs-format</li>
            <li>Automatisk filtrering og deduplikering</li>
            <li>Kun gyldige danske bogstaver (a-z, æ, ø, å)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
