
import { useEffect, useState, useRef } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!game?.timer_end_time || game.status !== 'playing') {
      setTimeLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    // Reset expiration flag when timer changes
    hasExpiredRef.current = false;

    const interval = setInterval(() => {
      const endTime = new Date(game.timer_end_time!).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);

      // Only call onTimerExpired once when timer reaches 0
      if (remaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        console.log('Timer expired, calling onTimerExpired');
        onTimerExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.timer_end_time, game?.status, onTimerExpired]);

  return timeLeft;
};
