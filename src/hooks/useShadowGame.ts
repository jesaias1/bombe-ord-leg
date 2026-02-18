import { useRef } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;

type Snapshot = {
  turn_seq: number;
  current_player_id: string;
  current_syllable: string;
  timer_duration: number;
  timer_end_time: string;
};

export function useShadowGame() {
  const snapRef = useRef<Snapshot | null>(null);

  const apply = (s: Snapshot) => {
    // Only move forward
    if (!snapRef.current || s.turn_seq > snapRef.current.turn_seq) {
      snapRef.current = s;
    }
  };

  const clearIfNewer = (serverGame: Game | null) => {
    if (!serverGame || !snapRef.current) return;
    const serverSeq = (serverGame as any)?.turn_seq ?? 0;
    if (serverSeq >= snapRef.current.turn_seq) {
      snapRef.current = null;
    }
  };

  const get = () => snapRef.current;

  return { apply, clearIfNewer, get };
}