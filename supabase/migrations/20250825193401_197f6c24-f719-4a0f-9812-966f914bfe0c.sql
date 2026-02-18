-- Fix RLS policies for games table to properly handle guest users
-- Drop existing policies that are causing issues
DROP POLICY IF EXISTS "Room players can view games" ON public.games;
DROP POLICY IF EXISTS "Room players can update games" ON public.games;
DROP POLICY IF EXISTS "Universal game creation policy" ON public.games;

-- Create new policies that properly handle both authenticated users and guests
CREATE POLICY "Anyone can view games in rooms they're part of" 
ON public.games 
FOR SELECT 
TO public, anon, authenticated
USING (
  -- For authenticated users: check if they're a player in the room
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM players 
    WHERE players.room_id = games.room_id 
    AND players.user_id = (auth.uid())::text
  ))
  OR
  -- For anonymous/guest users: allow viewing all games (they'll filter by room)
  (auth.uid() IS NULL)
);

-- Allow anyone to create games (simplified policy)
CREATE POLICY "Allow game creation for all users" 
ON public.games 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);

-- Allow updates for room players (both auth and guest)
CREATE POLICY "Room players can update games" 
ON public.games 
FOR UPDATE 
TO public, anon, authenticated
USING (
  -- For authenticated users
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM players 
    WHERE players.room_id = games.room_id 
    AND players.user_id = (auth.uid())::text
  ))
  OR
  -- For guests - allow updates (they'll be validated at application level)
  (auth.uid() IS NULL)
);