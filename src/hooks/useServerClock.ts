import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Returns serverClockOffsetMs = serverNow - clientNow */
export function useServerClock(offsetRefreshMs = 15000) {
  const [offset, setOffset] = useState(0);
  const inFlight = useRef(false);

  async function syncOnce() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc('get_server_epoch_ms');
      const t1 = Date.now();
      if (!error && typeof data === 'number') {
        // RTT correction: assume server time corresponds to the mid-point
        const clientMid = (t0 + t1) / 2;
        setOffset(data - clientMid);
      }
    } finally {
      inFlight.current = false;
    }
  }

  useEffect(() => {
    syncOnce();
    const id = setInterval(syncOnce, offsetRefreshMs);
    return () => clearInterval(id);
  }, [offsetRefreshMs]);

  return { offsetMs: offset }; // add to timers: serverNow = Date.now() + offsetMs
}