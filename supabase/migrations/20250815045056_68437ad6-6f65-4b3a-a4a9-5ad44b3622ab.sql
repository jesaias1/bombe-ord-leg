-- Fix RLS policy for games table to allow room members to create games
DROP POLICY IF EXISTS "Users can create games" ON public.games;

CREATE POLICY "Room members can create games" 
ON public.games 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = games.room_id 
    AND (
      players.user_id = auth.uid()::text 
      OR players.user_id LIKE 'guest_%'
    )
  )
);