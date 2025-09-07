import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';

export function useRoomRealtime(roomId?: string, onPing?: () => void) {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();

  useEffect(() => {
    if (!roomId) return;

    // Real-time updates for instant lobby updates
    const channel = supabase.channel(`room-${roomId}`, { 
      config: { broadcast: { ack: true } } 
    });

    // Listen to players changes for instant join/ready updates
    channel.on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, 
      () => {
        // Match the existing query key format
        queryClient.invalidateQueries({ queryKey: ['players', roomId, isGuest, user?.id] });
        onPing?.();
      }
    );
    
    // Listen to games changes
    channel.on(
      'postgres_changes', 
      { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` }, 
      () => {
        queryClient.invalidateQueries({ queryKey: ['game', roomId] });
        onPing?.();
      }
    );

    // Also listen to broadcast pings (via NOTIFY)
    channel.on('broadcast', { event: 'ping' }, () => onPing?.());

    channel.subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [roomId, onPing, queryClient, user?.id, isGuest]);
}