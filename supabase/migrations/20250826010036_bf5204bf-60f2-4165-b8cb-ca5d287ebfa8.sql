-- Create a view for safe room data exposure
CREATE OR REPLACE VIEW public.rooms_safe_view AS
SELECT 
  r.id,
  r.name,
  r.difficulty,
  r.bonus_letters_enabled,
  r.max_players,
  r.created_at,
  r.updated_at,
  CASE 
    WHEN r.creator_id = (auth.uid())::text THEN r.creator_id
    ELSE NULL
  END as creator_id
FROM public.rooms r;

-- Drop the old get_room_safe function to avoid confusion
DROP FUNCTION IF EXISTS public.get_room_safe(text);

-- Create unified room lookup function that accepts either code or UUID
CREATE OR REPLACE FUNCTION public.get_room_safe(p_room_locator text)
RETURNS TABLE(
  id text, 
  name text, 
  difficulty difficulty_level, 
  bonus_letters_enabled boolean, 
  max_players integer, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  creator_id text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_is_uuid boolean;
BEGIN
  -- Check if the locator is a UUID format
  v_is_uuid := p_room_locator ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  
  IF v_is_uuid THEN
    -- Look up by UUID (rooms.id)
    RETURN QUERY 
    SELECT 
      r.id,
      r.name,
      r.difficulty,
      r.bonus_letters_enabled,
      r.max_players,
      r.created_at,
      r.updated_at,
      CASE 
        WHEN r.creator_id = (auth.uid())::text THEN r.creator_id
        ELSE NULL
      END as creator_id
    FROM public.rooms r
    WHERE r.id = p_room_locator;
  ELSE
    -- Look up by code (assuming rooms.id is actually used as code in this system)
    RETURN QUERY 
    SELECT 
      r.id,
      r.name,
      r.difficulty,
      r.bonus_letters_enabled,
      r.max_players,
      r.created_at,
      r.updated_at,
      CASE 
        WHEN r.creator_id = (auth.uid())::text THEN r.creator_id
        ELSE NULL
      END as creator_id
    FROM public.rooms r
    WHERE r.id = p_room_locator;  -- In this system, rooms.id is the code
  END IF;
END; $$;