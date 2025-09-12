import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useFastGameSync(roomId?: string, enabled?: boolean, periodMs = 250) {
  const qc = useQueryClient();
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (!roomId || !enabled) return;
    const tick = () => qc.refetchQueries({ queryKey: ['game', roomId], type: 'active' });
    tick(); // kick once
    tRef.current = window.setInterval(tick, periodMs);
    return () => { if (tRef.current) clearInterval(tRef.current); tRef.current = null; };
  }, [roomId, enabled, periodMs, qc]);
}