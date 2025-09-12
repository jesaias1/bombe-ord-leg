import { useEffect, useRef, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useServerClock } from './useServerClock';

type Game = Tables<'games'>;
type Player = Tables<'players'>;

interface UseGameInputProps {
  game: Game | null;
  players: Player[];
  currentUserId?: string;
  onWordSubmit: (word: string) => Promise<boolean>;
  isSubmitting: boolean;
}

interface ShadowGame {
  get: () => {
    turn_seq: number;
    current_player_id: string;
    current_syllable: string;
    timer_duration: number;
    timer_end_time: string;
  } | null;
}

interface UseGameInputPropsWithShadow extends UseGameInputProps {
  shadowGame?: ShadowGame;
}

export const useGameInput = ({
  game,
  players,
  currentUserId,
  onWordSubmit,
  isSubmitting,
  shadowGame,
}: UseGameInputPropsWithShadow) => {
  const [currentWord, setCurrentWord] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { offsetMs } = useServerClock();

  // Use shadow state if available, fallback to server game state
  const snap = shadowGame?.get();
  
  const currentPlayerId = snap?.current_player_id ?? game?.current_player_id;
  const currentSyllable = snap?.current_syllable ?? game?.current_syllable;
  const timerEndTime = snap?.timer_end_time ?? game?.timer_end_time;
  const timerDuration = snap?.timer_duration ?? game?.timer_duration;
  
  // Who is up now?
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const currentUserPlayer = players.find(p => p.user_id === currentUserId);
  
  // Server-synced timing calculation
  const serverNow = () => Date.now() + offsetMs;
  const endTs = timerEndTime ? new Date(timerEndTime).getTime() : 0;
  const durationMs = (timerDuration ?? 0) * 1000;
  const startTs = endTs ? endTs - durationMs : 0;
  const GRACE_MS = 200; // tiny grace to smooth "just expired" submissions
  
  // Check if it's my turn
  const isMyTurn = !!currentPlayer && 
                   currentPlayer.user_id === currentUserId && 
                   game?.status === 'playing' &&
                   !!currentUserPlayer?.is_alive;

  // Use authoritative timing - only enable input from computed start moment
  const canInput = game?.status === 'playing' &&
                   isMyTurn &&
                   startTs > 0 &&
                   serverNow() >= startTs &&
                   serverNow() <= endTs + GRACE_MS &&
                   !isSubmitting;

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
  }, [currentPlayerId]); // Only focus on turn changes, not on canInput changes

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
    currentSyllable,
    focusInput: () => inputRef.current?.focus?.(),
  };
};
