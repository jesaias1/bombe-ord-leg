import { useMemo } from 'react';
import { resolveRoomUuid } from '@/lib/roomResolver';
import { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;

/**
 * Hook that provides a centralized way to get room UUID
 * Memoizes the resolver function for consistent behavior
 */
export function useRoomUuid(room: Room | null, roomLocator?: string) {
  const key = useMemo(() => room?.id ?? roomLocator ?? '', [room?.id, roomLocator]);
  
  // Return an async getter so callers can await right before an RPC
  return useMemo(() => async () => {
    console.log('🔄 useRoomUuid: resolving room UUID', { 
      roomId: room?.id, 
      roomLocator, 
      key 
    });
    
    const uuid = await resolveRoomUuid(room, key);
    
    console.log('✅ useRoomUuid: resolved UUID', { 
      input: { roomId: room?.id, roomLocator, key },
      output: uuid 
    });
    
    return uuid;
  }, [room, key]);
}