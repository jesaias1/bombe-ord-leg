
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

  // Fixed timer duration - consistent for all players
  const TIMER_DURATION = 15; // seconds

  const validateWord = async (word: string): Promise<boolean> => {
    // Check if word exists in Danish dictionary
    const { data, error } = await supabase
      .from('danish_words')
      .select('id')
      .eq('word', word.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error validating word:', error);
      return false;
    }

    return !!data;
  };

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

    // Validate word exists in Danish dictionary
    const isValidWord = await validateWord(trimmedWord);
    if (!isValidWord) {
      toast({
        title: "Ugyldigt ord",
        description: "Dette ord findes ikke i ordbogen",
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

      // Get next syllable
      console.log('Getting next syllable');
      const nextSyllable = await selectRandomSyllable(room.difficulty);
      
      if (!nextSyllable) {
        toast({
          title: "Fejl",
          description: "Kunne ikke vælge ny stavelse",
          variant: "destructive",
        });
        return false;
      }

      console.log('Selected next syllable:', nextSyllable);

      const updatedUsedWords = [...(game.used_words || []), trimmedWord];
      
      // Use server time for consistent timer calculation
      const serverTime = new Date();
      const timerEndTime = new Date(serverTime.getTime() + TIMER_DURATION * 1000);

      console.log(`Setting timer for ${TIMER_DURATION} seconds from server time:`, serverTime.toISOString(), 'ending at:', timerEndTime.toISOString());

      const { error } = await supabase
        .from('games')
        .update({
          current_player_id: nextPlayer.id,
          current_syllable: nextSyllable,
          used_words: updatedUsedWords,
          timer_end_time: timerEndTime.toISOString(),
          timer_duration: TIMER_DURATION,
          round_number: (game.round_number || 1) + 1,
          updated_at: serverTime.toISOString()
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

      console.log('Game updated successfully with syllable:', nextSyllable);
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

    console.log('Timer expired, getting next syllable');

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

    // Continue with next player and next syllable
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
      // Get next syllable
      const nextSyllable = await selectRandomSyllable(room.difficulty);
      
      if (nextSyllable) {
        console.log('Timer expired - selected next syllable:', nextSyllable);
        
        const timerDuration = Math.floor(Math.random() * 11) + 10;
        const timerEndTime = new Date(Date.now() + timerDuration * 1000);

        await supabase
          .from('games')
          .update({
            current_player_id: nextPlayer.id,
            current_syllable: nextSyllable,
            timer_end_time: timerEndTime.toISOString(),
            timer_duration: timerDuration,
            round_number: (game.round_number || 1) + 1
          })
          .eq('id', game.id);
      }
    }
  };

  const initializeGameSyllables = async (gameId: string): Promise<boolean> => {
    // This function is kept for compatibility but not used in the current implementation
    console.log('Game syllables initialization - using existing system');
    return true;
  };

  return {
    submitWord,
    handleTimerExpired,
    initializeGameSyllables,
    isSubmitting,
    setCurrentWord,
    currentWord
  };
};
