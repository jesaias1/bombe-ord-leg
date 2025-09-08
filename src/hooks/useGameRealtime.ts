import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type UseGameRealtimeOpts = {
  roomId?: string | null;
  gameId?: string | null;
  // optional: called when server increments the turn
  onTurnAdvance?: (turnSeq: number) => void;
};

type TurnPayload = {
  room_id: string;
  current_player_id: string;
  current_syllable: string;
  timer_end_time: string; // ISO
  timer_duration: number;
  turn_seq: number;
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

export function useGameRealtimeFast(roomId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-${roomId}`, { config: { broadcast: { ack: true } } })
      // ultra-fast path: host/player broadcasts the next turn
      .on('broadcast', { event: 'turn_advanced' }, (msg) => {
        const p = msg?.payload as TurnPayload | undefined;
        if (!p || p.room_id !== roomId) return;

        // update the game cache immediately
        qc.setQueryData(['game', roomId], (prev: any) => ({
          ...(prev || {}),
          room_id: roomId,
          current_player_id: p.current_player_id,
          current_syllable: p.current_syllable,
          timer_end_time: p.timer_end_time,
          timer_duration: p.timer_duration,
          turn_seq: p.turn_seq,
          status: 'playing',
          updated_at: new Date().toISOString(),
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, qc]);
}
