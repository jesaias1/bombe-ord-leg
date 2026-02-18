-- Fix RLS policy for games table to properly handle guest users
DROP POLICY IF EXISTS "Room members can create games" ON public.games;

CREATE POLICY "Room members can create games" 
ON public.games 
FOR INSERT 
WITH CHECK (
  -- For authenticated users
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = games.room_id 
    AND players.user_id = auth.uid()::text
  ))
  OR
  -- For all users (including guests) - allow if any player exists in the room
  (EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = games.room_id
  ))
);