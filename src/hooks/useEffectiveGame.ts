import { useMemo } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;
type ShadowSnap = {
  turn_seq: number;
  current_player_id: string;
  current_syllable: string;
  timer_duration: number;
  timer_end_time: string; // ISO
} | null;

/** Prefer shadow snapshot when present; otherwise fall back to server game */
export function useEffectiveGame(game: Game | null, snap: ShadowSnap) {
  return useMemo(() => {
    if (!snap || !game) {
      return game;
    }
    // Merge shadow snapshot with full game object
    return {
      ...game,
      turn_seq: snap.turn_seq,
      current_player_id: snap.current_player_id,
      current_syllable: snap.current_syllable,
      timer_duration: snap.timer_duration,
      timer_end_time: snap.timer_end_time,
    };
  }, [snap, game]);
}