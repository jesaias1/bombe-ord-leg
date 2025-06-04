
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { validateWord } from '@/utils/wordValidation';
import { selectRandomSyllable } from '@/utils/syllableSelection';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useGameActions = (
  game: Game | null,
  players: Player[],
  room: Room | null
) => {
  const [currentWord, setCurrentWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alivePlayers = players.filter(player => player.is_alive);

  const submitWord = useCallback(async () => {
    if (!game || !currentWord.trim() || isSubmitting || game.status !== 'playing') {
      console.log('Submission blocked:', { 
        hasGame: !!game, 
        hasWord: !!currentWord.trim(), 
        isSubmitting, 
        status: game?.status 
      });
      return false;
    }
    
    console.log('Starting word submission process');
    setIsSubmitting(true);
    
    try {
      const trimmedWord = currentWord.toLowerCase().trim();
      
      console.log(`Submitting word: "${trimmedWord}" for syllable: "${game.current_syllable}"`);
      
      // Check if word was already used
      if (game.used_words?.includes(trimmedWord)) {
        toast.error('Dette ord er allerede brugt!');
        setCurrentWord('');
        return false;
      }

      // Validate the word
      const isValid = await validateWord(trimmedWord, game.current_syllable || '');
      
      if (!isValid) {
        toast.error(`"${trimmedWord}" er ikke et gyldigt ord eller indeholder ikke "${game.current_syllable}"`);
        setCurrentWord('');
        return false;
      }

      // Find next player
      const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
      const nextPlayer = alivePlayers[nextPlayerIndex];

      if (!nextPlayer) {
        console.error('No next player found');
        toast.error('Fejl: Kunne ikke finde næste spiller');
        return false;
      }

      // Select new random syllable
      const newSyllable = await selectRandomSyllable(room?.difficulty || 'mellem');
      
      if (!newSyllable) {
        toast.error('Kunne ikke vælge ny stavelse');
        return false;
      }

      console.log(`Moving to next player: ${nextPlayer.name}, new syllable: ${newSyllable}`);

      // Add word to used words
      const updatedUsedWords = [...(game.used_words || []), trimmedWord];
      
      // Calculate new timer end time
      const timerDuration = game.timer_duration || 15;
      const newTimerEndTime = new Date(Date.now() + timerDuration * 1000).toISOString();

      // Update game in database
      const { error } = await supabase
        .from('games')
        .update({
          used_words: updatedUsedWords,
          current_player_id: nextPlayer.id,
          current_syllable: newSyllable,
          timer_end_time: newTimerEndTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (error) {
        console.error('Error updating game:', error);
        toast.error('Fejl ved opdatering af spil - prøv igen');
        return false;
      }

      // Success - clear the input and show success message
      setCurrentWord('');
      toast.success(`"${trimmedWord}" accepteret! Ny stavelse: "${newSyllable}"`);
      console.log('Word submission successful');
      return true;

    } catch (err) {
      console.error('Error submitting word:', err);
      toast.error('Fejl ved indsendelse af ord - prøv igen');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [game, currentWord, isSubmitting, alivePlayers, room]);

  const startGame = useCallback(async () => {
    if (!game || !room) return;

    try {
      const startingSyllable = await selectRandomSyllable(room.difficulty);
      
      if (!startingSyllable) {
        toast.error('Kunne ikke vælge startstavelse');
        return;
      }

      const randomPlayerIndex = Math.floor(Math.random() * alivePlayers.length);
      const startingPlayer = alivePlayers[randomPlayerIndex];

      if (!startingPlayer) {
        toast.error('Ingen spillere tilgængelige');
        return;
      }

      const timerDuration = game.timer_duration || 15;
      const timerEndTime = new Date(Date.now() + timerDuration * 1000).toISOString();

      const { error } = await supabase
        .from('games')
        .update({
          status: 'playing',
          current_player_id: startingPlayer.id,
          current_syllable: startingSyllable,
          timer_end_time: timerEndTime,
          used_words: [],
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (error) {
        console.error('Error starting game:', error);
        toast.error('Fejl ved start af spil');
      } else {
        toast.success(`Spillet starter! Stavelse: "${startingSyllable}"`);
      }
    } catch (err) {
      console.error('Error starting game:', err);
      toast.error('Fejl ved start af spil');
    }
  }, [game, room, alivePlayers]);

  return {
    currentWord,
    setCurrentWord,
    isSubmitting,
    submitWord,
    startGame
  };
};
