import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';

export function useRoomRealtime(roomId?: string, onPing?: () => void) {
  const queryClient = useQueryClient();
  const { user, isGuest } = useAuth();
  
  // Debounce refs for smooth realtime updates
  const playersDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const gameDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // Subscribe to Postgres changes
    const channel = supabase.channel(`room-${roomId}`, { 
      config: { broadcast: { ack: true } } 
    });

    const invalidatePlayers = () => {
      // Clear previous debounce
      if (playersDebounceRef.current) {
        clearTimeout(playersDebounceRef.current);
      }
      
      // Debounce with 50ms for smooth updates
      playersDebounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['players', roomId] });
        queryClient.invalidateQueries({ queryKey: ['players', roomId, isGuest, user?.id] });
        onPing?.();
      }, 50);
    };

    const invalidateGame = () => {
      // Clear previous debounce
      if (gameDebounceRef.current) {
        clearTimeout(gameDebounceRef.current);
      }
      
      // Debounce with 50ms for smooth updates
      gameDebounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['game', roomId] });
        onPing?.();
      }, 50);
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
      // Clear debounce timers
      if (playersDebounceRef.current) {
        clearTimeout(playersDebounceRef.current);
      }
      if (gameDebounceRef.current) {
        clearTimeout(gameDebounceRef.current);
      }
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId, queryClient, user?.id, isGuest, onPing]);
}