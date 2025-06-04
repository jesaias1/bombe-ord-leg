
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

  const handleTimerExpired = async () => {
    if (!game || !room) {
      console.log('No game or room available for timer expiration');
      return;
    }
    
    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (!currentPlayer) {
      console.log('No current player found for timer expiration');
      return;
    }

    if (!alivePlayers.length) {
      console.log('No alive players found');
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
      const remainingAlivePlayers = alivePlayers.filter(p => 
        p.id === currentPlayer.id ? !isNowDead : true
      );

      console.log(`Remaining alive players: ${remainingAlivePlayers.length}`);

      // Check if game should end
      if (remainingAlivePlayers.length <= 1) {
        console.log('Game ending - only 1 or fewer players remaining');
        
        const { error: gameError } = await supabase
          .from('games')
          .update({
            status: 'finished',
            current_player_id: null,
            timer_end_time: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (gameError) {
          console.error('Error ending game:', gameError);
        }

        toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`} - Spillet er slut!`);
      } else {
        // Continue game with next player
        const currentPlayerIndex = alivePlayers.findIndex(p => p.id === currentPlayer.id);
        let nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
        
        // Skip dead players
        while (!remainingAlivePlayers.find(p => p.id === alivePlayers[nextPlayerIndex].id)) {
          nextPlayerIndex = (nextPlayerIndex + 1) % alivePlayers.length;
        }
        
        const nextPlayer = alivePlayers[nextPlayerIndex];
        const newSyllable = await selectRandomSyllable(room.difficulty);

        if (newSyllable) {
          console.log(`Moving to next player: ${nextPlayer.name}, new syllable: ${newSyllable}`);
          
          const { error: gameError } = await supabase
            .from('games')
            .update({
              current_player_id: nextPlayer.id,
              current_syllable: newSyllable,
              timer_end_time: new Date(Date.now() + (game.timer_duration || 15) * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', game.id);

          if (gameError) {
            console.error('Error updating game after timeout:', gameError);
          }
        }

        toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`}`);
      }
    } catch (err) {
      console.error('Error handling timer expiration:', err);
      toast.error('Fejl ved håndtering af timer udløb');
    }
  };

  return { handleTimerExpired };
};
