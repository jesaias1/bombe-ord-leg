
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const lastTimerEndTimeRef = useRef<string | null>(null);
  const expiredCallbackRef = useRef(onTimerExpired);

  // Update callback ref when it changes
  useEffect(() => {
    expiredCallbackRef.current = onTimerExpired;
  }, [onTimerExpired]);

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
      console.log('Timer reset for new turn:', game.timer_end_time);
    }

    const updateTimer = () => {
      const endTime = new Date(game.timer_end_time!).getTime();
      const now = Date.now(); // Use Date.now() for consistency
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeLeft(remaining);
      console.log(`Timer update: ${remaining}s remaining, current time: ${new Date(now).toISOString()}, end time: ${game.timer_end_time}`);

      // Only call onTimerExpired once when timer reaches 0
      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        console.log('Timer expired, calling onTimerExpired');
        clearTimer();
        // Use the ref to avoid stale closure issues
        expiredCallbackRef.current();
      }
    };

    // Initial update
    updateTimer();

    // Set up interval if timer hasn't expired
    if (!hasExpiredRef.current) {
      intervalRef.current = setInterval(updateTimer, 1000); // Back to 1 second intervals for stability
    }

    return clearTimer;
  }, [game?.timer_end_time, game?.status, clearTimer]);

  return timeLeft;
};
