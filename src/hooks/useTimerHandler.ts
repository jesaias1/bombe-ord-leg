
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
  room: Room | null,
  currentWord?: string
) => {
  const alivePlayers = players.filter(player => player.is_alive);

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
      const updatedAlivePlayers = players.filter(p => {
        if (p.id === currentPlayer.id) {
          return !isNowDead; // Use the updated alive status for current player
        }
        return p.is_alive; // Use existing status for other players
      });

      console.log(`Remaining alive players after update: ${updatedAlivePlayers.length}`);

      // Check if game should end
      // For single player: end only when player is dead (0 lives)
      // For multiplayer: end when 1 or fewer players remain alive
      const shouldEndGame = players.length === 1 ? isNowDead : updatedAlivePlayers.length <= 1;
      
      if (shouldEndGame) {
        console.log('Game ending - ', players.length === 1 ? 'single player eliminated' : 'only 1 or fewer players remaining');
        
        // Add current word to incorrect words if it exists and contains the syllable
        const incorrectWords = [...(game.incorrect_words || [])];
        if (currentWord && currentWord.trim() && currentWord.toLowerCase().includes(game.current_syllable?.toLowerCase() || '')) {
          incorrectWords.push(currentWord.trim().toLowerCase());
        }
        
        const { error: gameError } = await supabase
          .from('games')
          .update({
            status: 'finished',
            current_player_id: null,
            timer_end_time: null,
            current_syllable: null,
            incorrect_words: incorrectWords,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (gameError) {
          console.error('Error ending game:', gameError);
        }

        // Show quick toast and end
        toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`} - Spillet er slut!`, {
          duration: 2000
        });
      } else {
        // Continue game with next player - faster transition
        const stillAlivePlayers = players.filter(p => {
          if (p.id === currentPlayer.id) {
            return !isNowDead; // Use updated status for current player
          }
          return p.is_alive; // Use existing status for other players
        });
        
        const currentPlayerIndexInAlive = stillAlivePlayers.findIndex(p => p.id === currentPlayer.id);
        let nextPlayerIndex;
        
        if (isNowDead) {
          // If current player is now dead, find next alive player
          nextPlayerIndex = 0; // Start with first alive player
        } else {
          // Current player is still alive, move to next
          nextPlayerIndex = (currentPlayerIndexInAlive + 1) % stillAlivePlayers.length;
        }
        
        const nextPlayer = stillAlivePlayers[nextPlayerIndex];
        const newSyllable = await selectRandomSyllable(room.difficulty);

        if (newSyllable) {
          console.log(`Moving to next player: ${nextPlayer.name}, new syllable: ${newSyllable}`);
          
          // Add current word to incorrect words if it exists and contains the syllable
          const incorrectWords = [...(game.incorrect_words || [])];
          if (currentWord && currentWord.trim() && currentWord.toLowerCase().includes(game.current_syllable?.toLowerCase() || '')) {
            incorrectWords.push(currentWord.trim().toLowerCase());
          }
          
          const timerDuration = game.timer_duration || 15;
          // Use proper timing to prevent instant expiration
          const newTimerEndTime = new Date(Date.now() + timerDuration * 1000).toISOString();

          const { error: gameError } = await supabase
            .from('games')
            .update({
              current_player_id: nextPlayer.id,
              current_syllable: newSyllable,
              timer_end_time: newTimerEndTime,
              incorrect_words: incorrectWords,
              updated_at: new Date().toISOString()
            })
            .eq('id', game.id);

          if (gameError) {
            console.error('Error updating game after timeout:', gameError);
          }
        }

        // Show quick toast for faster gameplay
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
  }, [game, players, room, alivePlayers, currentWord]);

  return { handleTimerExpired };
};
