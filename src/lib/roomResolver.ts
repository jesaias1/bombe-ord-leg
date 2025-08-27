import { supabase } from '@/integrations/supabase/client';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (s?: string | null): boolean => !!s && UUID_RX.test(s);

/**
 * Resolve a room UUID from:
 *  - hydrated room object (preferred),
 *  - a locator that may be a UUID or a short code.
 * Caches the result in memory to avoid extra roundtrips.
 */
const cache = new Map<string, string>(); // locator -> uuid

export async function resolveRoomUuid(
  room?: { id?: string | null; code?: string | null } | null,
  locator?: string | null
): Promise<string> {
  // 1) If we already have a valid UUID from room.id, use it
  if (room?.id && isUuid(room.id)) return room.id;

  // 2) If cache has it, return
  if (locator && cache.has(locator)) return cache.get(locator)!;

  // 3) If the locator itself is a UUID, trust it
  if (locator && isUuid(locator)) {
    cache.set(locator, locator);
    return locator;
  }

  // 4) Otherwise the locator is a CODE; resolve via get_room_safe (accepts code or uuid)
  const { data, error } = await supabase.rpc('get_room_safe', { p_room_locator: locator });
  if (error || !data || !data[0]?.id) {
    throw new Error('Room not found');
  }
  const uuid = data[0].id as string;
  if (locator) {
    cache.set(locator, uuid);
  }
  return uuid;
}