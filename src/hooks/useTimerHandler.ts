
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
    if (!game) return;
    
    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (!currentPlayer || !alivePlayers.length) return;

    try {
      const newLives = Math.max(0, currentPlayer.lives - 1);
      const isNowDead = newLives === 0;

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

      const remainingAlivePlayers = alivePlayers.filter(p => 
        p.id === currentPlayer.id ? !isNowDead : true
      );

      if (remainingAlivePlayers.length <= 1) {
        const { error: gameError } = await supabase
          .from('games')
          .update({
            status: 'finished',
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (gameError) {
          console.error('Error ending game:', gameError);
        }
      } else {
        const currentPlayerIndex = alivePlayers.findIndex(p => p.id === currentPlayer.id);
        let nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
        
        while (!remainingAlivePlayers.find(p => p.id === alivePlayers[nextPlayerIndex].id)) {
          nextPlayerIndex = (nextPlayerIndex + 1) % alivePlayers.length;
        }
        
        const nextPlayer = alivePlayers[nextPlayerIndex];
        const newSyllable = await selectRandomSyllable(room?.difficulty || 'mellem');

        if (newSyllable) {
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
      }

      toast.error(`${currentPlayer.name} løb tør for tid! ${isNowDead ? 'Elimineret!' : `${newLives} liv tilbage`}`);
    } catch (err) {
      console.error('Error handling timer expiration:', err);
    }
  };

  return { handleTimerExpired };
};
