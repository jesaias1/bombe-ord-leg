
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { importAllWords } from '@/utils/importDanishWords';
import { useToast } from '@/hooks/use-toast';

export const WordImporter = () => {
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<{ imported: number; errors: number } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importAllWords();
      setStats(result);
      
      toast({
        title: "Import afsluttet!",
        description: `${result.imported} ord importeret, ${result.errors} fejl`,
      });
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import fejlede",
        description: "Der opstod en fejl under import af ord",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Importer danske ord</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Dette vil importere en omfattende liste af danske ord til spillet.
        </p>
        
        <Button 
          onClick={handleImport} 
          disabled={importing}
          className="w-full"
        >
          {importing ? "Importerer..." : "Start import"}
        </Button>

        {stats && (
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p>✅ Importeret: {stats.imported} ord</p>
            <p>❌ Fejl: {stats.errors} ord</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
