
import { useEffect, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Game = Tables<'games'>;

export const useGameTimer = (game: Game | null, onTimerExpired: () => void) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!game?.timer_end_time) return;

    const interval = setInterval(() => {
      const endTime = new Date(game.timer_end_time!).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      setTimeLeft(remaining);

      if (remaining === 0) {
        onTimerExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.timer_end_time, onTimerExpired]);

  return timeLeft;
};
