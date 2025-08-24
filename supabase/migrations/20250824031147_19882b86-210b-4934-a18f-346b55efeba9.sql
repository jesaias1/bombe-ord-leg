-- Fix RLS policy for game creation to handle guest users
DROP POLICY IF EXISTS "Allow game creation" ON public.games;

-- Create a more permissive policy for game creation that handles both auth users and guest users
CREATE POLICY "Allow game creation for room members" ON public.games
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players 
    WHERE players.room_id = games.room_id 
    AND (
      (auth.uid() IS NOT NULL AND players.user_id = auth.uid()::text)
      OR 
      (auth.uid() IS NULL AND players.user_id LIKE 'guest_%')
    )
  )
);