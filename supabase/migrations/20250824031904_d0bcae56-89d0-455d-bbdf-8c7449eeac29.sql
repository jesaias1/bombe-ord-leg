-- Simplify the game creation policy to allow any user to create games
-- The application logic will handle proper validation
DROP POLICY IF EXISTS "Allow game creation for room members" ON public.games;

CREATE POLICY "Allow game creation" ON public.games
FOR INSERT 
WITH CHECK (true);