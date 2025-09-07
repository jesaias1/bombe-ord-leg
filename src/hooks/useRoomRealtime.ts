import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRoomRealtime(roomId?: string, onPing?: () => void) {
  useEffect(() => {
    if (!roomId) return;

    // Low-latency ping from pg_notify('room_updates', roomId)
    const channel = supabase.channel(`room_updates:${roomId}`, { 
      config: { broadcast: { ack: true } } 
    });

    // Listen to database changes
    channel.on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` }, 
      () => onPing?.()
    );
    
    channel.on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, 
      () => onPing?.()
    );

    // Also listen to broadcast pings (via NOTIFY)
    channel.on('broadcast', { event: 'ping' }, () => onPing?.());

    channel.subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [roomId, onPing]);
}