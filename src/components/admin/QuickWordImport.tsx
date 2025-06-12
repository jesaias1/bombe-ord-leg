
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { expandWordDatabase } from '@/utils/triggerWordImport';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const QuickWordImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Get current word count
  const { data: wordCount = 0, refetch } = useQuery({
    queryKey: ['quick-word-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('danish_words')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const handleQuickImport = async () => {
    setIsImporting(true);
    
    try {
      const result = await expandWordDatabase();
      
      toast({
        title: "Import gennemført!",
        description: `Importerede ${result.imported.toLocaleString()} ord fra ${result.totalSources} kilder`,
      });
      
      refetch();
    } catch (error) {
      console.error('Quick import failed:', error);
      toast({
        title: "Import fejlede",
        description: "Der opstod en fejl under import af ord",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex-1">
        <h3 className="font-semibold">Udvid Ordliste</h3>
        <p className="text-sm text-gray-600">
          Nuværende ord: {wordCount.toLocaleString()}
        </p>
      </div>
      <Button 
        onClick={handleQuickImport}
        disabled={isImporting}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isImporting ? 'Importerer...' : 'Udvid Nu'}
      </Button>
    </div>
  );
};
