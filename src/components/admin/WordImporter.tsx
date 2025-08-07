
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { importAllWords } from '@/utils/importDanishWords';
import { importEnhancedWords } from '@/utils/improvedWordImport';
import { ensureBasicWords } from '@/utils/ensureBasicWords';
import { QuickWordImport } from './QuickWordImport';
import { UpdateWordDatabase } from './UpdateWordDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const WordImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; sourceStats?: any } | null>(null);

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin-word-importer'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Check if user has admin role in user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      return !error && data?.role === 'admin';
    }
  });

  // Get word count
  const { data: wordCount = 0, refetch: refetchWordCount } = useQuery({
    queryKey: ['word-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const handleStandardImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      // Call the edge function for background processing
      const { data, error } = await supabase.functions.invoke('import-words', {
        body: { type: 'standard' }
      });

      if (error) {
        throw error;
      }

      setImportResult(data);
      refetchWordCount();
    } catch (error) {
      console.error('Standard import failed:', error);
      setImportResult({ imported: 0, errors: 1 });
    } finally {
      setIsImporting(false);
    }
  };

  const handleEnhancedImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      // Call the edge function for background processing
      const { data, error } = await supabase.functions.invoke('import-words', {
        body: { type: 'enhanced' }
      });

      if (error) {
        throw error;
      }

      setImportResult(data);
      refetchWordCount();
    } catch (error) {
      console.error('Enhanced import failed:', error);
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
        refetchWordCount();
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
    <div className="space-y-6">
      <UpdateWordDatabase />
      <QuickWordImport />
      
      <Card>
        <CardHeader>
          <CardTitle>Dansk Ord Importer</CardTitle>
          <CardDescription>
            Importer omfattende danske ordlister fra GitHub repositories.
            Aktuelt antal ord i databasen: {wordCount.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={handleStandardImport} 
              disabled={isImporting}
              variant="outline"
            >
              {isImporting ? 'Importerer...' : 'Standard Import'}
            </Button>
            <Button 
              onClick={handleEnhancedImport} 
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? 'Importerer...' : 'Forbedret Import'}
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
              <p className="text-sm text-gray-600">Importerer ord fra flere kilder...</p>
            </div>
          )}
          
          {importResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Import Resultat:</h3>
              <p>Importerede ord: {importResult.imported.toLocaleString()}</p>
              <p>Fejl: {importResult.errors}</p>
              {importResult.sourceStats && (
                <div className="mt-2">
                  <p className="font-medium">Kilder:</p>
                  {Object.entries(importResult.sourceStats).map(([source, count]) => (
                    <p key={source} className="text-sm">
                      {new URL(source).hostname}: {typeof count === 'number' ? count : 0} ord
                    </p>
                  ))}
                </div>
              )}
              {importResult.imported > 0 && (
                <p className="text-green-600 font-medium">Import gennemført succesfuldt!</p>
              )}
            </div>
          )}
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Standard Import:</strong> Grundlæggende danske ordlister</p>
            <p><strong>Forbedret Import:</strong> Omfattende ordsamling fra flere kilder inklusiv:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>LibreOffice ordbøger</li>
              <li>Frekvensbaserede ordlister</li>
              <li>Lemmatiserede danske ord</li>
              <li>Forbedret filtrering og kvalitetskontrol</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
