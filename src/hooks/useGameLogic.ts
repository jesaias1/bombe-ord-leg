
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;
type Player = Tables<'players'>;
type Room = Tables<'rooms'>;

export const useGameLogic = (
  game: Game | null, 
  players: Player[], 
  currentUserId?: string, 
  room?: Room | null
) => {
  const [currentWord, setCurrentWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current player
  const currentPlayer = game?.current_player_id 
    ? players.find(p => p.id === game.current_player_id)
    : null;

  // Check if it's current user's turn
  const isMyTurn = currentPlayer?.user_id === currentUserId;

  // Get alive players
  const alivePlayers = players.filter(player => player.is_alive);

  // Check if game can start
  const canStartGame = players.length >= 1 && 
    (players.some(p => p.user_id === currentUserId) || !currentUserId);

  const validateWord = async (word: string, syllable: string): Promise<boolean> => {
    if (!word || !syllable) return false;
    
    const trimmedWord = word.toLowerCase().trim();
    const trimmedSyllable = syllable.toLowerCase().trim();
    
    console.log(`Validating word: "${trimmedWord}" contains syllable: "${trimmedSyllable}"`);
    
    // Check if word contains the syllable (not just ends with it)
    if (!trimmedWord.includes(trimmedSyllable)) {
      console.log(`Word "${trimmedWord}" does not contain syllable "${trimmedSyllable}"`);
      return false;
    }

    // Check if word exists in database
    const { data, error } = await supabase
      .from('danish_words')
      .select('word')
      .eq('word', trimmedWord)
      .single();

    if (error || !data) {
      console.log(`Word "${trimmedWord}" not found in database`);
      return false;
    }

    console.log(`Word "${trimmedWord}" is valid!`);
    return true;
  };

  const selectRandomSyllable = async (difficulty: string): Promise<string | null> => {
    console.log(`Selecting random syllable for difficulty: ${difficulty}`);
    
    const { data, error } = await supabase
      .from('syllables')
      .select('syllable')
      .eq('difficulty', difficulty)
      .gt('word_count', 10); // Only select syllables that have enough words

    if (error || !data || data.length === 0) {
      console.error('Error fetching syllables:', error);
      return null;
    }

    // Randomize the selection to ensure variety
    const randomIndex = Math.floor(Math.random() * data.length);
    const selectedSyllable = data[randomIndex].syllable;
    
    console.log(`Selected syllable: "${selectedSyllable}" from ${data.length} available syllables`);
    return selectedSyllable;
  };

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

      // Select new random syllable to ensure variety
      const newSyllable = await selectRandomSyllable(room?.difficulty || 'mellem');
      
      if (!newSyllable) {
        toast.error('Kunne ikke vælge ny stavelse');
        setIsSubmitting(false);
        return;
      }

      // Update game with new syllable
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
      // Select random starting syllable
      const startingSyllable = await selectRandomSyllable(room.difficulty);
      
      if (!startingSyllable) {
        toast.error('Kunne ikke vælge startstavelse');
        return;
      }

      // Pick random starting player
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

  const handleTimerExpired = async () => {
    if (!game || !currentPlayer) return;

    try {
      const newLives = Math.max(0, currentPlayer.lives - 1);
      const isNowDead = newLives === 0;

      // Update player's lives and alive status
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

      // Check if game should end
      const remainingAlivePlayers = alivePlayers.filter(p => 
        p.id === currentPlayer.id ? !isNowDead : true
      );

      if (remainingAlivePlayers.length <= 1) {
        // Game over
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
        // Continue with next player and new syllable
        const currentPlayerIndex = alivePlayers.findIndex(p => p.id === currentPlayer.id);
        let nextPlayerIndex = (currentPlayerIndex + 1) % alivePlayers.length;
        
        // Skip dead players
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

  return {
    currentWord,
    setCurrentWord,
    isSubmitting,
    currentPlayer,
    isMyTurn,
    alivePlayers,
    canStartGame,
    submitWord,
    startGame,
    handleTimerExpired
  };
};
