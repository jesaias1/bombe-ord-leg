import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Clock = {
  offsetMs: number;   // add this to Date.now() to approximate server time
  rttMs: number;      // last round-trip for visibility/debug
};

export function useServerClock(pollMs = 20000): Clock {
  const [state, setState] = useState<Clock>({ offsetMs: 0, rttMs: 0 });
  const mounted = useRef(true);

  async function syncOnce() {
    const t0 = performance.now();
    const localSend = Date.now();

    const { data, error } = await supabase.rpc('get_server_time');
    const t1 = performance.now();

    if (error || !data) return;

    // serverNow from DB (UTC)
    const serverNow = new Date(data as string).getTime();
    const rtt = t1 - t0;

    // NTP-like estimate: serverTime ≈ serverNow + (rtt/2)
    const estimatedServerAtArrive = serverNow + rtt / 2;
    const offset = estimatedServerAtArrive - localSend - rtt / 2;

    if (!mounted.current) return;
    setState({ offsetMs: Math.round(offset), rttMs: Math.round(rtt) });
  }

  useEffect(() => {
    mounted.current = true;
    syncOnce();                   // initial
    const id = setInterval(syncOnce, pollMs);  // keep fresh every 20s
    const onVis = () => syncOnce();            // resync after tab back
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mounted.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pollMs]);

  return state;
}