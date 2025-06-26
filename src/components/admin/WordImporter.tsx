
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { importAllWords } from '@/utils/importDanishWords';
import { importEnhancedWords } from '@/utils/improvedWordImport';
import { importExpandedDanishWords } from '@/utils/expandedDanishImport';
import { importComprehensiveWords } from '@/utils/comprehensiveWordImport';
import { ensureBasicWords } from '@/utils/ensureBasicWords';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ComprehensiveWordImporter } from './ComprehensiveWordImporter';

export const WordImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; sourceStats?: any } | null>(null);

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      return user.email === 'lin4s@live.dk';
    }
  });

  // Get word count with more detailed stats
  const { data: wordStats, refetch: refetchWordCount } = useQuery({
    queryKey: ['word-stats'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      
      // Get sample of recent words
      const { data: sampleWords } = await supabase
        .from('danish_words')
        .select('word')
        .order('created_at', { ascending: false })
        .limit(5);
        
      return { 
        total: count || 0,
        sampleWords: sampleWords?.map(w => w.word) || []
      };
    }
  });

  const handleStandardImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      await ensureBasicWords();
      const result = await importAllWords();
      setImportResult(result);
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
      await ensureBasicWords();
      const result = await importEnhancedWords();
      setImportResult(result);
      refetchWordCount();
    } catch (error) {
      console.error('Enhanced import failed:', error);
      setImportResult({ imported: 0, errors: 1 });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExpandedImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      await ensureBasicWords();
      const result = await importExpandedDanishWords();
      setImportResult(result);
      refetchWordCount();
    } catch (error) {
      console.error('Expanded import failed:', error);
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
      {/* New Comprehensive Word Importer - Featured at top */}
      <ComprehensiveWordImporter />
      
      <Card>
        <CardHeader>
          <CardTitle>Standard Dansk Ord Importer</CardTitle>
          <CardDescription>
            Importer danske ordlister med bøjninger fra GitHub repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Word Statistics Display */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg text-blue-800 mb-2">📊 Ordliste Statistik</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {wordStats?.total.toLocaleString() || '0'} ord
                </p>
                <p className="text-sm text-gray-600">I databasen</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Seneste ord:</p>
                <div className="text-xs text-gray-600">
                  {wordStats?.sampleWords.join(', ') || 'Ingen ord endnu'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Button 
              onClick={handleStandardImport} 
              disabled={isImporting}
              variant="outline"
            >
              {isImporting ? 'Importerer...' : 'Standard'}
            </Button>
            <Button 
              onClick={handleEnhancedImport} 
              disabled={isImporting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isImporting ? 'Importerer...' : 'Forbedret'}
            </Button>
            <Button 
              onClick={handleExpandedImport} 
              disabled={isImporting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isImporting ? 'Importerer...' : 'Med Bøjninger'}
            </Button>
            <Button 
              onClick={clearWords} 
              variant="destructive"
              disabled={isImporting}
            >
              Ryd Alle
            </Button>
          </div>
          
          {isImporting && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-gray-600">Importerer ord med bøjninger...</p>
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
            <p><strong>Forbedret Import:</strong> Omfattende ordsamling fra flere kilder</p>
            <p><strong>Med Bøjninger:</strong> Udvidet import inklusiv bøjningsformer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
