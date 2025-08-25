-- Fix RLS policy for games table to allow unauthenticated guest users
-- Drop the current policy
DROP POLICY IF EXISTS "Enable game creation for all users" ON public.games;

-- Create a new policy that explicitly allows both authenticated and unauthenticated users
CREATE POLICY "Allow game creation for authenticated and guest users" 
ON public.games 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);