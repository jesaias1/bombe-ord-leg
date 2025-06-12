
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DANISH_SYLLABLES } from '@/utils/danishSyllables';
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

  const generateGameSyllables = (): string[] => {
    const syllables = [...DANISH_SYLLABLES];
    
    // Shuffle the syllables for this game session
    for (let i = syllables.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [syllables[i], syllables[j]] = [syllables[j], syllables[i]];
    }
    
    console.log(`Generated ${syllables.length} shuffled syllables for game`);
    return syllables;
  };

  const getNextSyllable = (gameData: Game): string | null => {
    // If no game syllables exist, generate them
    if (!gameData.game_syllables || gameData.game_syllables.length === 0) {
      console.log('No game syllables found, this should not happen in an active game');
      return null;
    }

    const currentIndex = gameData.syllable_index || 0;
    
    // If we've used all syllables, start over but skip recently used ones
    if (currentIndex >= gameData.game_syllables.length) {
      const recentlyUsed = gameData.used_words?.slice(-10) || [];
      const availableSyllables = gameData.game_syllables.filter(s => 
        !recentlyUsed.some(word => word.toLowerCase().includes(s.toLowerCase()))
      );
      
      if (availableSyllables.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSyllables.length);
        return availableSyllables[randomIndex];
      }
      
      // Fallback: restart from beginning
      return gameData.game_syllables[0];
    }
    
    return gameData.game_syllables[currentIndex];
  };

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

      // Get next syllable from the game's syllable sequence
      console.log('Getting next syllable from game sequence');
      const nextSyllable = getNextSyllable(game);
      
      if (!nextSyllable) {
        toast({
          title: "Fejl",
          description: "Kunne ikke vælge ny stavelse",
          variant: "destructive",
        });
        return false;
      }

      console.log('Selected next syllable from sequence:', nextSyllable);

      const updatedUsedWords = [...(game.used_words || []), trimmedWord];
      
      // Varied timer duration for each round
      const timerDuration = Math.floor(Math.random() * 11) + 10; // 10-20 seconds
      const timerEndTime = new Date(Date.now() + timerDuration * 1000);
      
      // Update syllable index
      const newSyllableIndex = ((game.syllable_index || 0) + 1);

      const { error } = await supabase
        .from('games')
        .update({
          current_player_id: nextPlayer.id,
          current_syllable: nextSyllable,
          used_words: updatedUsedWords,
          timer_end_time: timerEndTime.toISOString(),
          timer_duration: timerDuration,
          round_number: (game.round_number || 1) + 1,
          syllable_index: newSyllableIndex
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

    console.log('Timer expired, getting next syllable from sequence');

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

    // Continue with next player and next syllable from sequence
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
      // Get next syllable from game sequence
      const nextSyllable = getNextSyllable(game);
      
      if (nextSyllable) {
        console.log('Timer expired - selected next syllable from sequence:', nextSyllable);
        
        const timerDuration = Math.floor(Math.random() * 11) + 10;
        const timerEndTime = new Date(Date.now() + timerDuration * 1000);
        
        // Update syllable index
        const newSyllableIndex = ((game.syllable_index || 0) + 1);

        await supabase
          .from('games')
          .update({
            current_player_id: nextPlayer.id,
            current_syllable: nextSyllable,
            timer_end_time: timerEndTime.toISOString(),
            timer_duration: timerDuration,
            round_number: (game.round_number || 1) + 1,
            syllable_index: newSyllableIndex
          })
          .eq('id', game.id);
      }
    }
  };

  const initializeGameSyllables = async (gameId: string): Promise<boolean> => {
    try {
      const gameSyllables = generateGameSyllables();
      
      const { error } = await supabase
        .from('games')
        .update({
          game_syllables: gameSyllables,
          syllable_index: 0
        })
        .eq('id', gameId);

      if (error) {
        console.error('Error initializing game syllables:', error);
        return false;
      }

      console.log('Game syllables initialized successfully');
      return true;
    } catch (error) {
      console.error('Error in initializeGameSyllables:', error);
      return false;
    }
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
