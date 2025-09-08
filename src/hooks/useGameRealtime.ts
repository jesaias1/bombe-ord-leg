import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type UseGameRealtimeOpts = {
  roomId?: string | null;
  gameId?: string | null;
  // optional: called when server increments the turn
  onTurnAdvance?: (turnSeq: number) => void;
};

export function useGameRealtime({ roomId, gameId, onTurnAdvance }: UseGameRealtimeOpts) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!roomId || !gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`, { config: { broadcast: { ack: true } } })
      // Only the active game row — keep it lean & instant
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const next = payload.new as any;

          // Apply the new row directly to the cache (no refetch needed)
          qc.setQueryData(['game', roomId], (prev: any) =>
            prev ? { ...prev, ...next } : next
          );

          // When the server bump turn_seq, unlock input for the new player
          if (typeof next.turn_seq === 'number') {
            onTurnAdvance?.(next.turn_seq);
          }
        }
      )
      // Players changes (HP, is_alive etc.)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          // Update players cache directly when we have the row
          if (payload.new) {
            qc.setQueryData(['players', roomId], (prev: any[] | undefined) => {
              if (!Array.isArray(prev)) return prev; // let existing fetch fill it
              const newPlayer = payload.new as any;
              const idx = prev.findIndex(p => p.id === newPlayer.id);
              if (idx === -1) return prev;
              const copy = prev.slice();
              copy[idx] = { ...copy[idx], ...newPlayer };
              return copy;
            });
          } else {
            // Fallback: make sure list refreshes
            qc.invalidateQueries({ queryKey: ['players', roomId] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, gameId, qc, onTurnAdvance]);
}
