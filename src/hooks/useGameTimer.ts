
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
  
  // Track the current end + whether we've applied the lead-in this turn
  const endIso = game?.timer_end_time ?? null;
  const turnSeq = game?.turn_seq ?? 0;
  const leadAppliedRef = useRef<Record<number, boolean>>({}); // keyed by turnSeq
  const hasExpiredRef = useRef(false);

  function stop() {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }

  function tick() {
    const serverNow = Date.now() + offsetMs;
    const rawEnd = endIso ? new Date(endIso).getTime() : 0;

    // One-time lead-in per turn to absorb network/render delay
    let effectiveEnd = rawEnd;
    if (rawEnd > 0 && !leadAppliedRef.current[turnSeq]) {
      const remainingNow = rawEnd - serverNow;
      const MIN_REMAIN_MS = 1200; // ~1.2s cushion
      if (remainingNow < MIN_REMAIN_MS) {
        effectiveEnd = rawEnd + (MIN_REMAIN_MS - Math.max(0, remainingNow));
      }
      leadAppliedRef.current[turnSeq] = true;
    }

    const left = Math.max(0, effectiveEnd - serverNow);
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
    
    if (!endIso) {
      setMsLeft(0);
      return;
    }
    
    // Start fresh each turn (turn_seq change) or end change
    raf.current = requestAnimationFrame(tick);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endIso, turnSeq, offsetMs]); // <— resync when server offset refreshes

  // return seconds with 1-decimal precision for UI if you use it
  return Math.ceil(msLeft / 1000);
};
