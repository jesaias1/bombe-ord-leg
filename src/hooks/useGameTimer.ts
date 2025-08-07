
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useServerTime } from './useServerTime';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const lastTimerEndTimeRef = useRef<string | null>(null);
  const { getServerTime, isCalculated } = useServerTime();

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
      // Use server time for better synchronization
      const now = isCalculated ? getServerTime() : Date.now();
      
      // Calculate remaining time without buffer that might cause instant expiration
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);

      // Only call onTimerExpired once when timer reaches 0 and some time has passed
      // Add a small delay to prevent instant expiration on game start
      if (remaining === 0 && !hasExpiredRef.current) {
        // Check if timer was actually running (not a brand new timer)
        const timerAge = now - new Date(game.timer_end_time!).getTime() + (game.timer_duration || 15) * 1000;
        if (timerAge > 2000) { // Only expire if timer has been running for at least 2 seconds
          hasExpiredRef.current = true;
          console.log('Timer expired, calling onTimerExpired');
          clearTimer();
          onTimerExpired();
        }
      }
    };

    // Initial update
    updateTimer();

    // Set up interval if timer hasn't expired
    if (!hasExpiredRef.current) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }

    return clearTimer;
  }, [game?.timer_end_time, game?.status, onTimerExpired, clearTimer]);

  return timeLeft;
};
