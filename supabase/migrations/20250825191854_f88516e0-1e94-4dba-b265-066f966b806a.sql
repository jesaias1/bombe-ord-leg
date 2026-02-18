-- Fix the function security issue by setting the search path
CREATE OR REPLACE FUNCTION public.get_room_safe(room_id text)
RETURNS TABLE (
  id text,
  name text,
  difficulty difficulty_level,
  bonus_letters_enabled boolean,
  max_players integer,
  created_at timestamptz,
  updated_at timestamptz,
  creator_id text  -- Only exposed if you're the creator
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  WHERE r.id = room_id;
$$;