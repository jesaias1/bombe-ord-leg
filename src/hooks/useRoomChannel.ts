import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// simple per-room singleton cache (lives for the session)
const channelCache = new Map<string, any>();

export function useRoomChannel(roomId?: string | null) {
  const key = roomId ?? null;
  const chanRef = useRef<any>(null);

  useEffect(() => {
    // guard SSR / undefined room
    if (typeof window === 'undefined' || !key) return;

    // reuse existing channel if we already created one
    const cached = channelCache.get(key);
    if (cached) {
      chanRef.current = cached;
      return;
    }

    const ch = supabase.channel(`room-${key}`, {
      config: { broadcast: { ack: false } }, // lowest-latency fire-and-forget
    });

    // subscribe but never throw if API changes
    try {
      ch.subscribe((status: string) => {
        console.debug('[room-channel] status', key, status);
      });
    } catch (e) {
      console.warn('[room-channel] subscribe warn', e);
    }

    channelCache.set(key, ch);
    chanRef.current = ch;

    // IMPORTANT: keep channel alive while user is in the room.
    // No unsubscribe here to avoid tearing down during re-renders.
    return () => { /* no-op */ };
  }, [key]);

  return chanRef.current;
}

// Optional full dispose when actually leaving a room (call only on explicit Leave)
export function disposeRoomChannel(roomId?: string | null) {
  if (!roomId) return;
  const ch = channelCache.get(roomId);
  if (ch) {
    try { supabase.removeChannel(ch); } catch {}
    channelCache.delete(roomId);
  }
}