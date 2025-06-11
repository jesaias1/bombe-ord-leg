
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { selectRandomSyllable } from '@/utils/syllableSelection';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Game = Tables<'games'>;
type Player = Tables<'players'>;

export const useGameLogic = (
  game: Game | null,
  players: Player[],
  currentUserId?: string,
  room?: Room | null
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const { toast } = useToast();

  const submitWord = async (word: string): Promise<boolean> => {
    if (!game || !currentUserId || !room) return false;

    const trimmedWord = word.trim().toLowerCase();
    
    if (trimmedWord.length < 3) {
      toast({
        title: "For kort ord",
        description: "Ordet skal være mindst 3 bogstaver langt",
        variant: "destructive",
      });
      return false;
    }

    if (!trimmedWord.includes(game.current_syllable?.toLowerCase() || '')) {
      toast({
        title: "Ugyldigt ord",
        description: `Ordet skal indeholde "${game.current_syllable}"`,
        variant: "destructive",
      });
      return false;
    }

    if (game.used_words?.includes(trimmedWord)) {
      toast({
        title: "Ord allerede brugt",
        description: "Dette ord er allerede blevet brugt",
        variant: "destructive",
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      const alivePlayers = players.filter(p => p.is_alive);
      const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
      const nextPlayer = alivePlayers[nextPlayerIndex];

      // Get a FRESH random syllable for the next round - this is key!
      console.log('Getting fresh random syllable for next round with difficulty:', room.difficulty);
      const nextSyllable = await selectRandomSyllable(room.difficulty);
      
      if (!nextSyllable) {
        toast({
          title: "Fejl",
          description: "Kunne ikke vælge ny stavelse",
          variant: "destructive",
        });
        return false;
      }

      console.log('Selected fresh syllable for next round:', nextSyllable);

      const updatedUsedWords = [...(game.used_words || []), trimmedWord];
      
      // Varied timer duration for each round
      const timerDuration = Math.floor(Math.random() * 11) + 10; // 10-20 seconds
      const timerEndTime = new Date(Date.now() + timerDuration * 1000);

      const { error } = await supabase
        .from('games')
        .update({
          current_player_id: nextPlayer.id,
          current_syllable: nextSyllable, // Always fresh syllable
          used_words: updatedUsedWords,
          timer_end_time: timerEndTime.toISOString(),
          timer_duration: timerDuration,
          round_number: (game.round_number || 1) + 1
        })
        .eq('id', game.id);

      if (error) {
        console.error('Error updating game:', error);
        toast({
          title: "Fejl",
          description: "Kunne ikke opdatere spillet",
          variant: "destructive",
        });
        return false;
      }

      console.log('Game updated successfully with new syllable:', nextSyllable);
      setCurrentWord('');
      return true;
    } catch (error) {
      console.error('Error submitting word:', error);
      toast({
        title: "Fejl",
        description: "Der opstod en fejl ved indsendelse af ordet",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimerExpired = async () => {
    if (!game || !room) return;

    const currentPlayer = players.find(p => p.id === game.current_player_id);
    if (!currentPlayer) return;

    console.log('Timer expired, getting fresh syllable for next round');

    // Remove a life from current player
    const newLives = Math.max(0, currentPlayer.lives - 1);
    const isStillAlive = newLives > 0;

    await supabase
      .from('players')
      .update({
        lives: newLives,
        is_alive: isStillAlive
      })
      .eq('id', currentPlayer.id);

    const remainingAlivePlayers = players.filter(p => 
      p.id === currentPlayer.id ? isStillAlive : p.is_alive
    );

    if (remainingAlivePlayers.length <= 1) {
      // Game over
      await supabase
        .from('games')
        .update({ status: 'finished' })
        .eq('id', game.id);
      return;
    }

    // Continue with next player and FRESH syllable
    const alivePlayers = players.filter(p => p.is_alive);
    const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
    let nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
    
    // Skip eliminated player if current player just died
    if (!isStillAlive) {
      const stillAlivePlayers = alivePlayers.filter(p => p.id !== currentPlayer.id);
      if (stillAlivePlayers.length > 0) {
        nextPlayerIndex = currentPlayerIndex % stillAlivePlayers.length;
      }
    }

    const nextAlivePlayers = alivePlayers.filter(p => p.id !== currentPlayer.id || isStillAlive);
    const nextPlayer = nextAlivePlayers[nextPlayerIndex];

    if (nextPlayer) {
      // Get fresh syllable for next player
      const nextSyllable = await selectRandomSyllable(room.difficulty);
      
      if (nextSyllable) {
        console.log('Timer expired - selected fresh syllable for next player:', nextSyllable);
        
        const timerDuration = Math.floor(Math.random() * 11) + 10;
        const timerEndTime = new Date(Date.now() + timerDuration * 1000);

        await supabase
          .from('games')
          .update({
            current_player_id: nextPlayer.id,
            current_syllable: nextSyllable, // Fresh syllable after timer expires
            timer_end_time: timerEndTime.toISOString(),
            timer_duration: timerDuration,
            round_number: (game.round_number || 1) + 1
          })
          .eq('id', game.id);
      }
    }
  };

  return {
    submitWord,
    handleTimerExpired,
    isSubmitting,
    setCurrentWord,
    currentWord
  };
};
