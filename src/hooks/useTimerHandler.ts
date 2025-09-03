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
    console.log('🕰️ Timer expired handler called', {
      gameStatus: game?.status,
      currentPlayerId: game?.current_player_id,
      gameId: game?.id,
      roomId: room?.id,
      userId: user?.id,
      pendingTurnSeq: pendingTurnSeqRef.current,
      gameTurnSeq: game?.round_number
    });

    // Guard: game must be playing
    if (!game || game.status !== 'playing') {
      console.log('⏹️ Game not in playing state, skipping timeout');
      return;
    }

    // Guard: must have user
    if (!user?.id) {
      console.log('❌ No user ID, cannot handle timeout');
      return;
    }

    // Find the current player
    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (!currentPlayer) {
      console.log('❌ No current player found');
      return;
    }

    // Guard: Only the current player should trigger timeout
    if (currentPlayer.user_id !== user.id) {
      console.log('⏭️ Not current player, skipping timeout', {
        currentPlayerUserId: currentPlayer.user_id,
        myUserId: user.id
      });
      return;
    }

    // Guard: Idempotent - prevent duplicate calls for the same turn
    if (pendingTurnSeqRef.current === game.round_number) {
      console.log('🔄 Already processing timeout for this turn, skipping');
      return;
    }

    pendingTurnSeqRef.current = game.round_number;

    try {
      const payload = {
        p_room_id: room?.id || roomLocator,  // TEXT room code
        p_player_id: currentPlayer.id        // UUID player id
      };
      
      console.log('🚀 RPC handle_timeout payload:', payload);

      const { data, error } = await supabase.rpc('handle_timeout', payload);

      if (error) {
        console.error('❌ handle_timeout RPC error:', error);
        
        // Check if it's a "turn already advanced" error - this is expected and OK
        if (error.message?.includes('Turn already advanced') || 
            error.message?.includes('already been advanced') ||
            error.message?.includes('current turn') ||
            error.message?.includes('Not your turn')) {
          console.log('ℹ️ Turn already advanced by another player, ignoring error');
          return; // Don't show toast for this expected case
        }
        
        toast.error('Fejl ved håndtering af timer udløb');
        return;
      }

      if (data) {
        console.log('✅ handle_timeout success:', data);
        
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
      console.error('💥 Unexpected error in handleTimerExpired:', err);
      
      toast.error('Fejl ved håndtering af timer udløb', {
        duration: 1500
      });
    } finally {
      // Always clear the pending flag
      pendingTurnSeqRef.current = null;
    }
  }, [game, players, room, roomLocator, currentWord, user]);

  return { handleTimerExpired };
};