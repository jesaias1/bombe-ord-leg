
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

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
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      // Ensure timer doesn't show unrealistic values
      const maxTimer = game.timer_duration || 15;
      const clampedRemaining = Math.min(remaining, maxTimer);
      
      console.log('Timer update - endTime:', endTime, 'now:', now, 'remaining:', remaining, 'clamped:', clampedRemaining);
      
      setTimeLeft(clampedRemaining);
      
      // Only call onTimerExpired once when timer reaches 0
      if (clampedRemaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        console.log('Timer expired, calling onTimerExpired');
        clearTimer();
        expiredCallbackRef.current();
      }
    };

    // Initial update
    updateTimer();

    // Set up interval if timer hasn't expired
    if (!hasExpiredRef.current) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }

    return clearTimer;
  }, [game?.timer_end_time, game?.status, game?.timer_duration, clearTimer]);

  return timeLeft;
};
