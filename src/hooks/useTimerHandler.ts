import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useTimerHandler = (
  game: Game | null,
  players: Player[],
  room: Room | null,
  roomLocator?: string,
  currentWord?: string,
  user?: { id: string } | null
) => {
  const alivePlayers = players.filter(player => player.is_alive);
  const pendingTurnSeqRef = useRef<number | null>(null);

  const handleTimerExpired = useCallback(async () => {
    if (!game || game.status !== 'playing') return;

    const current = players.find(p => p.id === game.current_player_id);
    if (!current || current.user_id !== user?.id) return;

    if (pendingTurnSeqRef.current === (game as any)?.turn_seq) return;
    pendingTurnSeqRef.current = (game as any)?.turn_seq;

    try {
      const { data, error } = await supabase.rpc('handle_timeout', {
        p_room_id: room?.id || roomLocator,
        p_player_id: current.id,
      });

      if (error && !/turn already advanced|current turn/i.test(error.message)) {
        toast.error(error.message);
      }
    } finally {
      pendingTurnSeqRef.current = null;
    }
  }, [game, players, user?.id, room?.id, roomLocator]);

  return { handleTimerExpired };
};