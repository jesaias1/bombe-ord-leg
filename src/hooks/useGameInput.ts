import { useEffect, useRef, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;
type Player = Tables<'players'>;

interface UseGameInputProps {
  game: Game | null;
  players: Player[];
  currentUserId?: string;
  onWordSubmit: (word: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export const useGameInput = ({
  game,
  players,
  currentUserId,
  onWordSubmit,
  isSubmitting,
}: UseGameInputProps) => {
  const [currentWord, setCurrentWord] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Who is up now?
  const currentPlayer = players.find(p => p.id === game?.current_player_id);
  const currentUserPlayer = players.find(p => p.user_id === currentUserId);
  
  // Fully server-driven: only check server state
  const isMyTurn = !!currentPlayer && 
                   currentPlayer.user_id === currentUserId && 
                   game?.status === 'playing' &&
                   !!currentUserPlayer?.is_alive;

  // Only actual submission disables me locally; never block because of helper/loaders
  const canInput = isMyTurn && !isSubmitting;
  
  console.log('useGameInput: canInput=', canInput, 'isMyTurn=', isMyTurn, 'isSubmitting=', isSubmitting, 'currentPlayer=', currentPlayer?.name);

  // Focus input when it becomes the user's turn (only on turn change, not every render)
  useEffect(() => {
    if (canInput && inputRef.current && !inputRef.current.matches(':focus')) {
      // Small delay to ensure DOM is ready and avoid focus conflicts
      const timer = setTimeout(() => {
        if (inputRef.current && !inputRef.current.matches(':focus')) {
          inputRef.current.focus();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [game?.current_player_id]); // Only focus on turn changes, not on canInput changes

  // Reset game state when game changes
  useEffect(() => {
    if (game?.status === 'waiting') {
      setCurrentWord('');
      setIsGameOver(false);
    } else if (game?.status === 'finished') {
      setIsGameOver(true);
    }
  }, [game?.status, game?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInput || !currentWord.trim()) return;

    const success = await onWordSubmit(currentWord.trim());
    
    if (success) {
      // Clear input on successful submission
      setCurrentWord('');
      inputRef.current?.focus();
    }
    // On failure, keep the word so user can try again
  };

  const handleWordSubmit = async (word: string): Promise<boolean> => {
    console.log('useGameInput: handleWordSubmit called with word:', word);
    console.log('useGameInput: canInput=', canInput, 'word.trim()=', word.trim());
    if (!canInput || !word.trim()) {
      console.log('useGameInput: Submission blocked - canInput:', canInput, 'word empty:', !word.trim());
      return false;
    }

    console.log('useGameInput: Calling onWordSubmit from useGameActions');
    const success = await onWordSubmit(word.trim());
    
    console.log('useGameInput: onWordSubmit returned:', success);
    if (success) {
      // Clear input on successful submission
      setCurrentWord('');
      inputRef.current?.focus();
    }
    // On failure, keep the word so user can try again
    return success;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return {
    currentWord,
    setCurrentWord,
    canInput,
    isSubmitting,
    inputRef,
    handleSubmit,
    handleWordSubmit,
    handleKeyDown,
    isCurrentUser: currentPlayer?.user_id === currentUserId,
    currentPlayer,
    focusInput: () => inputRef.current?.focus?.(),
  };
};
