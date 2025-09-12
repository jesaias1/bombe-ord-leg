
import { useEffect, useRef, useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { useServerClock } from './useServerClock';

type Game = Tables<'games'>;

export function useGameTimer(game: {
  timer_end_time: string | null,
  timer_duration?: number,
  turn_seq?: number
}, onExpired: () => Promise<void> | void) {

  const { offsetMs } = useServerClock();
  const [msLeft, setMsLeft] = useState(0);
  const raf = useRef<number | null>(null);
  const lastEnd = game?.timer_end_time ?? null;
  const hasExpiredRef = useRef(false);

  function stop() {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }

  function tick() {
    const serverNow = Date.now() + offsetMs;
    const end = lastEnd ? new Date(lastEnd).getTime() : 0;
    const left = Math.max(0, end - serverNow);
    setMsLeft(left);
    
    if (left <= 0 && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      stop();
      onExpired?.();
    } else if (left > 0) {
      raf.current = requestAnimationFrame(tick);
    }
  }

  useEffect(() => {
    stop();
    hasExpiredRef.current = false; // Reset expiration flag on timer restart
    
    if (!lastEnd) {
      setMsLeft(0);
      return;
    }
    
    // Start fresh each turn (turn_seq change) or end change
    raf.current = requestAnimationFrame(tick);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEnd, game?.turn_seq, offsetMs]); // <— resync when server offset refreshes

  // return seconds with 1-decimal precision for UI if you use it
  return Math.ceil(msLeft / 1000);
};
