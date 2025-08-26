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

  // Determine if current user can input
  const currentPlayer = players.find(p => p.id === game?.current_player_id);
  const isCurrentUser = currentPlayer?.user_id === currentUserId;
  const canInput = game?.status === 'playing' && isCurrentUser && !isSubmitting && !isGameOver;

  // Focus input when it becomes the user's turn
  useEffect(() => {
    if (canInput && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [canInput, game?.current_player_id]);

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
    isCurrentUser,
    currentPlayer,
    inputRef,
    handleSubmit,
    handleKeyDown,
    isGameOver,
  };
};
