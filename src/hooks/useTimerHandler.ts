import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { useServerClock } from './useServerClock';
import { useRoomChannel } from '@/hooks/useRoomChannel';

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
  const isCallingRef = useRef(false);
  const queryClient = useQueryClient();
  const { offsetMs } = useServerClock();
  const channel = useRoomChannel(room?.id || roomLocator);

  const handleTimerExpired = useCallback(async () => {
    // Guards
    if (!game || game.status !== 'playing') {
      console.log('Timer expired but game not playing:', game?.status);
      return;
    }

    const current = players.find(p => p.id === game.current_player_id);
    if (!current) {
      console.log('Timer expired but no current player found');
      return;
    }

    // Only the current player device should call timeout
    if (user?.id && current.user_id !== user.id) {
      console.log('Timer expired but not current user turn');
      return;
    }

    // Prevent double fire in the same turn
    const turnSeq = (game as any)?.turn_seq ?? -1;
    if (pendingTurnSeqRef.current === turnSeq || isCallingRef.current) {
      console.log('Timer expired but already handling this turn');
      return;
    }
    pendingTurnSeqRef.current = turnSeq;
    isCallingRef.current = true;

    console.log('Handling timer expiry for player:', current.name, 'turn:', turnSeq);

    try {
      const { data, error } = await supabase.rpc('handle_timeout', {
        p_room_id: room?.id || roomLocator,
        p_player_id: current.id,
      });

      if (error) {
        // Ignore expected idempotency/ordering errors from server
        const msg = (error.message || '').toLowerCase();
        if (!/turn already advanced|not your turn|current turn/.test(msg)) {
          console.error('handle_timeout error:', error);
          toast.error('Fejl ved håndtering af timeren');
        } else {
          console.log('Ignoring expected timeout error:', msg);
        }
        return;
      }

      console.log('Timeout handled successfully:', data);

      // ⬇️ Immediately refresh both game and players so hearts update right away
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['game', room?.id] }),
        queryClient.invalidateQueries({ queryKey: ['players', room?.id] }),
      ]);

      // Optional optimistic hint: if server returned lives_remaining, update my card
      if (data && typeof data === 'object' && (data as any)?.lives_remaining != null && current?.id) {
        const livesRemaining = (data as any).lives_remaining;
        queryClient.setQueryData(['players', room?.id], (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((p: any) =>
            p.id === current.id
              ? { ...p, lives: livesRemaining, is_alive: livesRemaining > 0 }
              : p
          );
        });
      }

      // Handle successful timeout with optimistic updates for multiplayer
      if (data && typeof data === 'object' && (data as any)?.success) {
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

        // Apply shadow state immediately for instant UI update
        if (shadowGame && !responseData.game_ended && responseData.turn_seq && responseData.current_player_id && 
            responseData.current_syllable && responseData.timer_end_time && 
            responseData.timer_duration) {
          console.log('Applying shadow state for new turn:', responseData.turn_seq);
          shadowGame.apply({
            turn_seq: responseData.turn_seq,
            current_player_id: responseData.current_player_id,
            current_syllable: responseData.current_syllable,
            timer_duration: responseData.timer_duration,
            timer_end_time: responseData.timer_end_time,
          });
        }

        // Broadcast turn advance to other clients
        if (!responseData.game_ended) {
          try {
            console.debug('[broadcast] sending turn_advanced from handleTimeout');
            const res = await channel?.send({
              type: 'broadcast',
              event: 'turn_advanced',
              payload: {
                roomId: room?.id || roomLocator,
                at: Date.now(),
              },
            });
            if (res?.error) console.warn('[broadcast] send error', res.error);
          } catch (e) {
            console.warn('[broadcast] send failed', e);
          }

          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ['game', room?.id], type: 'active' });
          }, 180);
        } else {
          console.log('Game ended after timeout');
        }
      }
    } catch (e) {
      console.error('handle_timeout unexpected:', e);
      toast.error('Uventet fejl - prøv at genindlæs siden');
    } finally {
      // Unlock for next turn
      isCallingRef.current = false;
      pendingTurnSeqRef.current = null;
    }
  }, [game, players, user?.id, room?.id, roomLocator, queryClient, offsetMs, shadowGame, channel]);

  return { handleTimerExpired };
};