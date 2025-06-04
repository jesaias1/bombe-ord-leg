
import { useState } from 'react';
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

  const submitWord = async () => {
    if (!game || !currentWord.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const trimmedWord = currentWord.toLowerCase().trim();
      
      // Check if word was already used
      if (game.used_words?.includes(trimmedWord)) {
        toast.error('Dette ord er allerede brugt!');
        setCurrentWord('');
        setIsSubmitting(false);
        return;
      }

      // Validate the word
      const isValid = await validateWord(trimmedWord, game.current_syllable || '');
      
      if (!isValid) {
        toast.error(`"${trimmedWord}" er ikke et gyldigt ord eller indeholder ikke "${game.current_syllable}"`);
        setCurrentWord('');
        setIsSubmitting(false);
        return;
      }

      // Add word to used words
      const updatedUsedWords = [...(game.used_words || []), trimmedWord];
      
      // Find next player
      const currentPlayerIndex = alivePlayers.findIndex(p => p.id === game.current_player_id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
      const nextPlayer = alivePlayers[nextPlayerIndex];

      // Select new random syllable
      const newSyllable = await selectRandomSyllable(room?.difficulty || 'mellem');
      
      if (!newSyllable) {
        toast.error('Kunne ikke vælge ny stavelse');
        setIsSubmitting(false);
        return;
      }

      // Update game
      const { error } = await supabase
        .from('games')
        .update({
          used_words: updatedUsedWords,
          current_player_id: nextPlayer.id,
          current_syllable: newSyllable,
          timer_end_time: new Date(Date.now() + (game.timer_duration || 15) * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (error) {
        console.error('Error updating game:', error);
        toast.error('Fejl ved opdatering af spil');
      } else {
        toast.success(`"${trimmedWord}" accepteret! Ny stavelse: "${newSyllable}"`);
        setCurrentWord('');
      }
    } catch (err) {
      console.error('Error submitting word:', err);
      toast.error('Fejl ved indsendelse af ord');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGame = async () => {
    if (!game || !room) return;

    try {
      const startingSyllable = await selectRandomSyllable(room.difficulty);
      
      if (!startingSyllable) {
        toast.error('Kunne ikke vælge startstavelse');
        return;
      }

      const randomPlayerIndex = Math.floor(Math.random() * alivePlayers.length);
      const startingPlayer = alivePlayers[randomPlayerIndex];

      const { error } = await supabase
        .from('games')
        .update({
          status: 'playing',
          current_player_id: startingPlayer.id,
          current_syllable: startingSyllable,
          timer_end_time: new Date(Date.now() + (game.timer_duration || 15) * 1000).toISOString(),
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
  };

  return {
    currentWord,
    setCurrentWord,
    isSubmitting,
    submitWord,
    startGame
  };
};
