import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button"; 
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface ReadyToggleProps {
  roomId: string;
  userId: string;
  ready: boolean;
}

export function ReadyToggle({ roomId, userId, ready }: ReadyToggleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const toggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      const { data, error } = await supabase.rpc('set_player_ready', { 
        p_room_id: roomId, 
        p_user_id: userId, 
        p_ready: !ready 
      });
      
      if (error || !(data as any)?.success) {
        console.error('Error toggling ready state:', error || data);
        toast({
          title: "Fejl",
          description: "Kunne ikke ændre klar-status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in toggle:', error);
      toast({
        title: "Fejl", 
        description: "Kunne ikke ændre klar-status",
        variant: "destructive",
      });
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