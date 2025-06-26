
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { importComprehensiveWords } from '@/utils/comprehensiveWordImport';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const ComprehensiveWordImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin-comprehensive'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      return user.email === 'lin4s@live.dk';
    }
  });

  // Get word count
  const { data: wordCount = 0, refetch: refetchWordCount } = useQuery({
    queryKey: ['comprehensive-word-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const handleComprehensiveImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const result = await importComprehensiveWords();
      setImportResult(result);
      refetchWordCount();
      
      toast({
        title: "Omfattende import gennemført!",
        description: `Importerede ${result.imported.toLocaleString()} ord inkl. manglende almindelige ord`,
      });
    } catch (error) {
      console.error('Comprehensive import failed:', error);
      setImportResult({ imported: 0, errors: 1 });
      toast({
        title: "Import fejlede",
        description: "Der opstod en fejl under den omfattende import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-800">🚀 Omfattende Ordimport</CardTitle>
        <CardDescription>
          Importer manglende almindelige ord som "sindssygt", slang, moderne ord og alle deres bøjninger
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-bold text-lg mb-2">📊 Nuværende Status</h3>
          <p className="text-2xl font-bold text-purple-600">
            {wordCount.toLocaleString()} ord i databasen
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Mangler sandsynligvis mange almindelige ord og slang
          </p>
        </div>

        <Button 
          onClick={handleComprehensiveImport} 
          disabled={isImporting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3"
          size="lg"
        >
          {isImporting ? '🔄 Importerer omfattende ordliste...' : '🚀 Start Omfattende Import'}
        </Button>
        
        {isImporting && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-center text-gray-600">
              Importerer manglende ord som "sindssygt", slang og moderne udtryk...
            </p>
          </div>
        )}
        
        {importResult && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-2 text-green-800">✅ Import Resultat:</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Importerede ord:</strong> {importResult.imported?.toLocaleString() || 0}</p>
              <p><strong>Essentielle ord tilføjet:</strong> {importResult.essentialWordsAdded || 0}</p>
              <p><strong>Fejl:</strong> {importResult.errors || 0}</p>
              <p><strong>Kilder:</strong> {importResult.totalSources || 0}</p>
            </div>
            {importResult.imported > 0 && (
              <p className="text-green-600 font-medium mt-2">
                🎉 Nu skulle ord som "sindssygt", "vanvittigt", "fed" osv. virke!
              </p>
            )}
          </div>
        )}
        
        <div className="text-sm text-gray-600 space-y-2 bg-white p-3 rounded border">
          <p><strong>Denne import tilføjer:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Manglende almindelige ord: sindssygt, vanvittigt, fed, sej, lækker</li>
            <li>Moderne slang og udtryk: cool, nice, crazy, wow</li>
            <li>Informelle ord og svovlord</li>
            <li>Anglicismer: okay, app, smartphone, pizza</li>
            <li>Alle bøjningsformer for ovenstående</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
