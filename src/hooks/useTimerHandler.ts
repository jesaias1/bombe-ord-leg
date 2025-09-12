import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { useServerClock } from './useServerClock';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useTimerHandler = (
  game: Game | null,
  players: Player[],
  room: Room | null,
  roomLocator?: string,
  currentWord?: string,
  user?: { id: string } | null,
  shadowGame?: { apply: (snapshot: any) => void }
) => {
  const alivePlayers = players.filter(player => player.is_alive);
  const pendingTurnSeqRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { offsetMs } = useServerClock();

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

      // Handle successful timeout with optimistic updates
      if (!error && data && typeof data === 'object' && (data as any)?.success) {
        const responseData = data as {
          success: boolean;
          timeout: boolean;
          lives_remaining: number;
          player_eliminated: boolean;
          game_ended: boolean;
          current_player_id?: string;
          current_player_name?: string;
          current_syllable?: string;
          timer_end_time?: string;
          timer_duration?: number;
          turn_seq?: number;
        };

        // Immediately update React Query cache for optimistic turn advance
        if (responseData.game_ended) {
          queryClient.setQueryData(['game', room?.id], (prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'finished',
              timer_end_time: null,
              current_syllable: null,
              updated_at: new Date().toISOString(),
            };
          });
        } else if (responseData.timer_end_time) {
          queryClient.setQueryData(['game', room?.id], (prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              current_player_id: responseData.current_player_id ?? prev.current_player_id,
              current_syllable: responseData.current_syllable ?? prev.current_syllable,
              timer_end_time: responseData.timer_end_time ?? prev.timer_end_time,
              timer_duration: responseData.timer_duration ?? prev.timer_duration,
              turn_seq: responseData.turn_seq ?? (prev.turn_seq ?? 0) + 1,
              status: 'playing',
              updated_at: new Date().toISOString(),
            };
          });
        }
        // Fire a tiny safety invalidate shortly after
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['game', room?.id] });
        }, 300);

        // Apply shadow state immediately for instant UI update
        if (shadowGame && !responseData.game_ended && responseData.turn_seq && responseData.current_player_id && 
            responseData.current_syllable && responseData.timer_end_time && 
            responseData.timer_duration) {
          shadowGame.apply({
            turn_seq: responseData.turn_seq,
            current_player_id: responseData.current_player_id,
            current_syllable: responseData.current_syllable,
            timer_duration: responseData.timer_duration,
            timer_end_time: responseData.timer_end_time,
          });
        }

        // Ping everyone with the turn change
        if (room?.id && responseData.current_player_id) {
          supabase.channel(`game-fast-${room.id}`).send({
            type: 'broadcast',
            event: 'turn_advanced',
            payload: {
              room_id: room.id,
              current_player_id: responseData.current_player_id,
              current_syllable: responseData.current_syllable,
              timer_end_time: responseData.timer_end_time,
              timer_duration: responseData.timer_duration,
              turn_seq: responseData.turn_seq,
            },
          });
        }
      }
    } finally {
      pendingTurnSeqRef.current = null;
    }
  }, [game, players, user?.id, room?.id, roomLocator, queryClient, offsetMs, shadowGame]);

  return { handleTimerExpired };
};