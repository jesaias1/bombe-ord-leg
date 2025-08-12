-- Tighten RLS on players and add sanitized RPC for room members

-- Ensure RLS enabled
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;

-- Authenticated users can insert their own player row
CREATE POLICY "Authenticated users can insert their player row"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Guests (anon) can insert guest player rows (needed for current guest flow)
CREATE POLICY "Guests can insert guest player rows"
ON public.players
FOR INSERT
TO anon
WITH CHECK (user_id LIKE 'guest_%');

-- Authenticated room members can view players in their room
CREATE POLICY "Room members can view players (auth)"
ON public.players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players me
    WHERE me.room_id = players.room_id
      AND me.user_id = auth.uid()::text
  )
);

-- Keep existing UPDATE/ADMIN policies as-is (already present):
--   "Players can update their own data" and "Admins can manage all players"

-- Create a SECURITY DEFINER RPC to return sanitized player data for a room.
-- It reveals user_id only for the caller's own row (auth user or provided guest id).
CREATE OR REPLACE FUNCTION public.get_players_public(p_room_id text, p_guest_id text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  lives integer,
  is_alive boolean,
  turn_order integer,
  joined_at timestamptz,
  user_id text,
  room_id text,
  name text
) AS $$
  SELECT 
    pl.id,
    pl.lives,
    pl.is_alive,
    pl.turn_order,
    pl.joined_at,
    CASE 
      WHEN auth.uid() IS NOT NULL AND pl.user_id = auth.uid()::text THEN pl.user_id
      WHEN auth.uid() IS NULL AND p_guest_id IS NOT NULL AND pl.user_id = p_guest_id THEN pl.user_id
      ELSE NULL
    END AS user_id,
    pl.room_id,
    pl.name
  FROM public.players pl
  WHERE pl.room_id = p_room_id
    AND (
      -- Authenticated callers: must be a room member
      (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.players me
        WHERE me.room_id = p_room_id AND me.user_id = auth.uid()::text
      ))
      OR
      -- Guests: must provide their guest id and be a room member
      (auth.uid() IS NULL AND p_guest_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.players me
        WHERE me.room_id = p_room_id AND me.user_id = p_guest_id
      ))
    )
  ORDER BY pl.joined_at ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
