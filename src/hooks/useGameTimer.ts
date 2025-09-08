
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useServerClock } from './useServerClock';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const lastTimerEndTimeRef = useRef<string | null>(null);
  const { offsetMs } = useServerClock();

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Clear any existing timer
    clearTimer();
    
    if (!game?.timer_end_time || game.status !== 'playing') {
      setTimeLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    // Reset expiration flag when timer changes
    if (lastTimerEndTimeRef.current !== game.timer_end_time) {
      hasExpiredRef.current = false;
      lastTimerEndTimeRef.current = game.timer_end_time;
    }

    const updateTimer = () => {
      const endTime = new Date(game.timer_end_time!).getTime();
      const serverNow = Date.now() + offsetMs; // Use server-synced time
      
      // Calculate remaining time
      const timeDiff = endTime - serverNow;
      const remaining = Math.max(0, Math.ceil(timeDiff / 1000));
      
      setTimeLeft(remaining);

      // Only call onTimerExpired once when timer reaches 0
      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        console.log('Timer expired, calling onTimerExpired');
        clearTimer();
        onTimerExpired();
      }
    };

    // Initial update
    updateTimer();

    // Set up interval if timer hasn't expired
    if (!hasExpiredRef.current) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }

    return clearTimer;
  }, [game?.timer_end_time, game?.status, onTimerExpired, clearTimer, offsetMs]);

  return timeLeft;
};
