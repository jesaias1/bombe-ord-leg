
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { selectRandomSyllable } from '@/utils/syllableSelection';
import { resolveRoomUuid } from '@/lib/roomResolver';

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
    if (!game || !room || game.status !== 'playing') {
      console.log('Timer expired but game is not in playing state');
      return;
    }
    
    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (!currentPlayer) {
      console.log('No current player found for timer expiration');
      return;
    }

    // Only the current player should call timeout
    if (user?.id !== currentPlayer.user_id) {
      console.log('Timer expired but not current user - ignoring');
      return;
    }

    // Idempotent guard - prevent multiple timeout calls for same turn
    if (pendingTurnSeqRef.current === game.round_number) {
      console.log('Timeout already pending for this turn - ignoring');
      return;
    }
    pendingTurnSeqRef.current = game.round_number;

    console.log(`Timer expired for player: ${currentPlayer.name}, current lives: ${currentPlayer.lives}`);

    try {
      // Resolve room UUID to handle both codes and UUIDs
      const roomUuid = await resolveRoomUuid(room, roomLocator);
      
      // Use server-side timeout handler with UUID parameters
      const { data, error } = await supabase.rpc('handle_timeout', {
        p_room_id: roomUuid,        // UUID
        p_player_id: currentPlayer.id  // Player UUID instead of user UUID
      });

      if (error) {
        console.error('Error handling timeout:', error);
        
        // Check for "turn already advanced" type errors and ignore them
        if (error.message?.includes('Turn already advanced') || 
            error.message?.includes('Not your turn')) {
          console.log('Turn already advanced - ignoring timeout error');
          pendingTurnSeqRef.current = null;
          return;
        }
        
        toast.error('Fejl ved håndtering af timer udløb');
        pendingTurnSeqRef.current = null;
        return;
      }

      if (data) {
        console.log('Timeout handled:', data);
        
        // Type assertion for the data response
        const responseData = data as {
          success: boolean;
          timeout: boolean;
          lives_remaining: number;
          player_eliminated: boolean;
          game_ended?: boolean;
          next_player?: string;
          next_syllable?: string;
        };
        
        const livesMsg = responseData.lives_remaining > 0 
          ? `${responseData.lives_remaining} liv tilbage` 
          : 'Elimineret!';
        
        if (responseData.game_ended) {
          toast.error(`${currentPlayer.name} løb tør for tid! ${livesMsg} - Spillet er slut!`, {
            duration: 2000
          });
        } else if (responseData.player_eliminated) {
          toast.error(`${currentPlayer.name} løb tør for tid! ${livesMsg}`, {
            duration: 1500
          });
        } else {
          toast.error(`${currentPlayer.name} løb tør for tid! ${livesMsg}`, {
            duration: 1500
          });
        }
      }
    } catch (err) {
      console.error('Error handling timer expiration:', err);
      
      // Check if it's a room resolution error
      if (err instanceof Error && err.message === 'Room not found') {
        toast.error('Kunne ikke finde rummet', {
          duration: 1500
        });
      } else {
        toast.error('Fejl ved håndtering af timer udløb', {
          duration: 1500
        });
      }
    } finally {
      // Clear pending flag after completion
      pendingTurnSeqRef.current = null;
    }
  }, [game, players, room, roomLocator, currentWord, user]);

  return { handleTimerExpired };
};
