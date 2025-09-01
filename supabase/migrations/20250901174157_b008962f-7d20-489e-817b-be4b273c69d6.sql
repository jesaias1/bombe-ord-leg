-- Drop existing function and recreate with proper signature
DROP FUNCTION IF EXISTS public.get_room_safe(text);

-- Recreate get_room_safe to accept locator (code or uuid) and return canonical room
CREATE OR REPLACE FUNCTION public.get_room_safe(p_room_locator text)
RETURNS SETOF rooms
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  -- Check if input is a UUID format
  IF p_room_locator ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN QUERY SELECT * FROM rooms r WHERE r.id = p_room_locator;
  ELSE
    -- Treat as room code - look up by id field since rooms table uses id as the locator
    RETURN QUERY SELECT * FROM rooms r WHERE r.id = p_room_locator;
  END IF;
END $$;