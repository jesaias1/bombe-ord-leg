import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRoomChannel(roomId?: string) {
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    if (chanRef.current) return;

    const channel = supabase.channel(`room-${roomId}`, { config: { broadcast: { ack: true } } });
    channel.subscribe();
    chanRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      chanRef.current = null;
    };
  }, [roomId]);

  return chanRef.current;
}