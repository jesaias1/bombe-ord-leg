
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { importAllWords } from '@/utils/importDanishWords';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const WordImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  // Check if user is admin
  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return data?.role || 'user';
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Error clearing words:', error);
      } else {
        setImportResult({ imported: 0, errors: 0 });
        // Refresh word count
        window.location.reload();
      }
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  if (userRole !== 'admin') {
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
          Importer en omfattende liste af danske ord til spildatabasen.
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
            <p className="text-sm text-gray-600">Importerer ord i batches...</p>
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
          <p><strong>Indeholder over 3000+ danske ord:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Grundlæggende ord og navneord</li>
            <li>Udsagnsord i alle former</li>
            <li>Ord der ender på 'ng', 'st', 'nd', 'nt' og andre stavelser</li>
            <li>Familieord, dyr, mad, natur, farver, tal</li>
            <li>Komplekse ord til avancerede spillere</li>
            <li>Professionelle og akademiske termer</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
