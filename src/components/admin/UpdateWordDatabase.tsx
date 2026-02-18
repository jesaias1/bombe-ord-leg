import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ensureBasicWords } from '@/utils/ensureBasicWords';
import { expandWordDatabase } from '@/utils/triggerWordImport';

export const UpdateWordDatabase = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleQuickUpdate = async () => {
    setIsUpdating(true);
    try {
      const success = await ensureBasicWords();
      if (success) {
        toast({
          title: "Ord opdateret",
          description: "De manglende ord er nu tilføjet til databasen",
        });
      } else {
        toast({
          title: "Fejl",
          description: "Der opstod en fejl ved opdatering af ord",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating words:', error);
      toast({
        title: "Fejl",
        description: "Der opstod en uventet fejl",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFullUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await expandWordDatabase();
      toast({
        title: "Database opdateret",
        description: `${result.imported} ord importeret med ${result.errors} fejl`,
      });
    } catch (error) {
      console.error('Error expanding database:', error);
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved fuld opdatering",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opdater Ord Database</CardTitle>
        <CardDescription>
          Tilføj manglende danske ord til spil-databasen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={handleQuickUpdate}
            disabled={isUpdating}
            variant="outline"
          >
            {isUpdating ? 'Opdaterer...' : 'Hurtig Opdatering'}
          </Button>
          <Button 
            onClick={handleFullUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? 'Opdaterer...' : 'Fuld Opdatering'}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Hurtig Opdatering:</strong> Tilføjer kun de nyligt rapporterede manglende ord</p>
          <p><strong>Fuld Opdatering:</strong> Kører komplet import fra alle kilder</p>
        </div>
      </CardContent>
    </Card>
  );
};