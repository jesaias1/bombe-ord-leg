
import { useEffect, useState, useRef, useCallback } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const lastTimerEndTimeRef = useRef<string | null>(null);
  const expiredCallbackRef = useRef(onTimerExpired);

  // Calculate server time offset on mount
  useEffect(() => {
    const calculateServerOffset = async () => {
      try {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from('games')
          .select('updated_at')
          .limit(1)
          .single();
        
        if (!error && data?.updated_at) {
          const endTime = Date.now();
          const requestTime = (endTime - startTime) / 2;
          const serverTime = new Date(data.updated_at).getTime();
          const localTime = startTime + requestTime;
          setServerTimeOffset(serverTime - localTime);
          console.log('Server time offset calculated:', serverTime - localTime, 'ms');
        }
      } catch (err) {
        console.log('Could not calculate server offset, using local time');
        setServerTimeOffset(0);
      }
    };

    calculateServerOffset();
  }, []);

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
      const now = Date.now() + serverTimeOffset; // Use server-adjusted time
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeLeft(remaining);
      
      // Only call onTimerExpired once when timer reaches 0
      if (remaining === 0 && !hasExpiredRef.current) {
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
  }, [game?.timer_end_time, game?.status, serverTimeOffset, clearTimer]);

  return timeLeft;
};
