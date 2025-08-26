import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;
type Player = Tables<'players'>;

interface UseGameSubscriptionsProps {
  roomId?: string;
  gameId?: string;
  onGameUpdate?: () => void;
  onPlayersUpdate?: () => void;
}

export const useGameSubscriptions = ({
  roomId,
  gameId,
  onGameUpdate,
  onPlayersUpdate,
}: UseGameSubscriptionsProps) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Cleanup function to unsubscribe from all channels
  const cleanup = () => {
    channelsRef.current.forEach(channel => {
      console.log('Unsubscribing from channel:', channel.topic);
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  useEffect(() => {
    if (!roomId) return cleanup;

    // Subscribe to players changes
    const playersChannel = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Players change:', payload);
          onPlayersUpdate?.();
        }
      )
      .subscribe();

    channelsRef.current.push(playersChannel);

    return cleanup;
  }, [roomId, onPlayersUpdate]);

  useEffect(() => {
    if (!gameId) return;

    // Subscribe to specific game changes
    const gameChannel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('Game change:', payload);
          onGameUpdate?.();
        }
      )
      .subscribe();

    channelsRef.current.push(gameChannel);

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, onGameUpdate]);

  return { cleanup };
};