
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { selectRandomSyllable } from '@/utils/syllableSelection';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useTimerHandler = (
  game: Game | null,
  players: Player[],
  room: Room | null
) => {
  const alivePlayers = players.filter(player => player.is_alive);

  // Fixed timer duration for consistency
  const TIMER_DURATION = 15; // seconds

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

    console.log(`Timer expired for player: ${currentPlayer.name}, current lives: ${currentPlayer.lives}`);

    try {
      // Update player lives and status
      const newLives = Math.max(0, currentPlayer.lives - 1);
      const isNowDead = newLives === 0;

      console.log(`Updating player ${currentPlayer.name}: new lives = ${newLives}, is dead = ${isNowDead}`);

      const { error: playerError } = await supabase
        .from('players')
        .update({
          lives: newLives,
          is_alive: !isNowDead
        })
        .eq('id', currentPlayer.id);

      if (playerError) {
        console.error('Error updating player:', playerError);
        return;
      }

      // Calculate remaining alive players after this update
      const updatedAlivePlayers = alivePlayers.filter(p => 
        p.id === currentPlayer.id ? !isNowDead : true
      );

      console.log(`Remaining alive players after update: ${updatedAlivePlayers.length}`);

      // Check if game should end
      if (updatedAlivePlayers.length <= 1) {
        console.log('Game ending - only 1 or fewer players remaining');
        
        const { error: gameError } = await supabase
          .from('games')
          .update({
            status: 'finished',
            current_player_id: null,
            timer_end_time: null,
            current_syllable: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (gameError) {
          console.error('Error ending game:', gameError);
        }

        const wordsGuessed = game.used_words?.length || 0;
        toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`} - Spillet er slut! ${wordsGuessed} ord gættet i alt.`, {
          duration: 3000
        });
      } else {
        // Continue game with next player
        const currentPlayerIndex = alivePlayers.findIndex(p => p.id === currentPlayer.id);
        let nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
        
        // Skip the current player if they're now dead
        let attempts = 0;
        while (attempts < alivePlayers.length) {
          const candidatePlayer = alivePlayers[nextPlayerIndex];
          if (candidatePlayer.id !== currentPlayer.id || !isNowDead) {
            break;
          }
          nextPlayerIndex = (nextPlayerIndex + 1) % alivePlayers.length;
          attempts++;
        }
        
        const nextPlayer = alivePlayers[nextPlayerIndex];
        const newSyllable = await selectRandomSyllable(room.difficulty);

        if (newSyllable) {
          console.log(`Moving to next player: ${nextPlayer.name}, new syllable: ${newSyllable}`);
          
          // Create a proper timer end time - exactly 15 seconds from now
          const newTimerEndTime = new Date(Date.now() + TIMER_DURATION * 1000);

          console.log(`Setting timer for ${TIMER_DURATION} seconds, ending at:`, newTimerEndTime.toISOString());

          const { error: gameError } = await supabase
            .from('games')
            .update({
              current_player_id: nextPlayer.id,
              current_syllable: newSyllable,
              timer_end_time: newTimerEndTime.toISOString(),
              timer_duration: TIMER_DURATION,
              updated_at: new Date().toISOString()
            })
            .eq('id', game.id);

          if (gameError) {
            console.error('Error updating game after timeout:', gameError);
          }
        }

        toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`}`, {
          duration: 1500
        });
      }
    } catch (err) {
      console.error('Error handling timer expiration:', err);
      toast.error('Fejl ved håndtering af timer udløb', {
        duration: 1500
      });
    }
  }, [game, players, room, alivePlayers]);

  return { handleTimerExpired };
};
