import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const QuickWordImport = () => {
  const [wordInput, setWordInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const addWords = async () => {
    if (!wordInput.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast mindst ét ord",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    
    try {
      // Split by comma, newline, or space and clean up
      const words = wordInput
        .split(/[,\n\s]+/)
        .map(word => word.toLowerCase().trim())
        .filter(word => 
          word.length > 0 && 
          word.length >= 2 && 
          word.length <= 25 &&
          /^[a-zæøå]+$/.test(word)
        );

      if (words.length === 0) {
        toast({
          title: "Fejl",
          description: "Ingen gyldige ord fundet",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('danish_words')
        .upsert(
          words.map(word => ({ word })),
          { onConflict: 'word' }
        );

      if (error) {
        console.error('Error adding words:', error);
        toast({
          title: "Fejl",
          description: "Kunne ikke tilføje ord til databasen",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succes",
          description: `Tilføjede ${words.length} ord til databasen`,
        });
        setWordInput('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Fejl",
        description: "Uventet fejl ved tilføjelse af ord",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hurtig Ord Tilføjelse</CardTitle>
        <CardDescription>
          Tilføj enkelte ord eller flere ord til databasen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="wordInput">Ord (adskil med komma, mellemrum eller ny linje)</Label>
          <Input
            id="wordInput"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            placeholder="f.eks. strukket, sendte, tænkt, bygget"
            className="mt-1"
          />
        </div>
        
        <Button 
          onClick={addWords} 
          disabled={isAdding || !wordInput.trim()}
          className="w-full"
        >
          {isAdding ? 'Tilføjer...' : 'Tilføj Ord'}
        </Button>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Kun danske bogstaver (a-z, æ, ø, å) er tilladt</li>
            <li>Ord skal være mellem 2-25 tegn lange</li>
            <li>Duplikater ignoreres automatisk</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};