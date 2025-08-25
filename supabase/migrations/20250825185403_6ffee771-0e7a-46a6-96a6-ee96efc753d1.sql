-- Fix game creation RLS policy for guest users
-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Allow game creation for all users" ON public.games;

-- Create a more permissive policy that allows anyone to create games
-- This is safe because games are tied to rooms and room access is already controlled
CREATE POLICY "Enable game creation for all users" 
ON public.games 
FOR INSERT 
WITH CHECK (true);