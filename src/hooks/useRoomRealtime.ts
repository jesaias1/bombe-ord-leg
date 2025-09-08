import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';

export function useRoomRealtime(roomId?: string, onPing?: () => void) {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();

  useEffect(() => {
    if (!roomId) return;

    // Subscribe to Postgres changes
    const channel = supabase.channel(`room-${roomId}`, { 
      config: { broadcast: { ack: true } } 
    });

    const invalidatePlayers = () => {
      // invalidate both keys you use in code
      queryClient.invalidateQueries({ queryKey: ['players', roomId] });
      queryClient.invalidateQueries({ queryKey: ['players', roomId, isGuest, user?.id] });
      onPing?.();
    };

    const invalidateGame = () => {
      queryClient.invalidateQueries({ queryKey: ['game', roomId] });
      onPing?.();
    };

    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
      invalidatePlayers
    );
    channel.on('postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `room_id=eq.${roomId}` },
      invalidateGame
    );

    // Also listen to our NOTIFY nudge
    channel.on('broadcast', { event: 'ping' }, () => invalidatePlayers());

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Small kick so late joins appear instantly
        invalidatePlayers();
      }
    });

    // Fallback poll while in lobby (covers any realtime hiccups)
    const poll = setInterval(invalidatePlayers, 2500);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient, user?.id, isGuest, onPing]);
}