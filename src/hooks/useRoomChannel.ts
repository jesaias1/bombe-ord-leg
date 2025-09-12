import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// simple singleton cache per roomId
const channelCache = new Map<string, any>();

export function useRoomChannel(roomId?: string | null) {
  const roomKey = roomId ?? null;
  const chanRef = useRef<any>(null);

  useEffect(() => {
    if (!roomKey) return;

    // reuse if exists
    if (channelCache.has(roomKey)) {
      chanRef.current = channelCache.get(roomKey);
      return;
    }

    const channel = supabase.channel(`room-${roomKey}`, {
      config: { broadcast: { ack: true } },
    });

    console.debug('[room-channel] subscribe', roomKey);
    channel.subscribe((status: string) => {
      console.debug('[room-channel] status', roomKey, status);
    });

    channelCache.set(roomKey, channel);
    chanRef.current = channel;

    // IMPORTANT: do not remove the channel on unmount here.
    // The GameRoom-level cleanup will handle it when truly leaving the room.
    return () => {
      // no-op: keep channel alive while user is in room
    };
  }, [roomKey]);

  return chanRef.current;
}

// Optional helper to fully dispose when truly leaving a room (call once on leave)
export function disposeRoomChannel(roomId?: string | null) {
  const key = roomId ?? null;
  const ch = key ? channelCache.get(key) : null;
  if (ch) {
    try {
      console.debug('[room-channel] dispose', key);
      supabase.removeChannel(ch);
    } catch {}
    channelCache.delete(key);
  }
}