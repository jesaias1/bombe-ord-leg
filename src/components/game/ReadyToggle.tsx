import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function ReadyToggle({ 
  roomId, 
  playerId, 
  ready 
}: { 
  roomId: string; 
  playerId: string; 
  ready: boolean; 
}) {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const toggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      const { error } = await supabase.rpc('set_player_ready', { 
        p_room_id: roomId, 
        p_player_id: playerId, 
        p_ready: !ready 
      });
      
      if (error) {
        console.error('Error toggling ready state:', error);
        toast({
          title: "Fejl",
          description: "Kunne ikke ændre klar-status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in toggle:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Button 
      variant={ready ? 'default' : 'outline'} 
      onClick={toggle}
      disabled={isToggling}
      size="sm"
      className={ready ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {ready ? 'Klar ✅' : 'Klar?'}
    </Button>
  );
}