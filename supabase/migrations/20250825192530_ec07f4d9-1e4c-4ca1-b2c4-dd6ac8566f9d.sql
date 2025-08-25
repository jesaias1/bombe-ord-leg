-- Fix the foreign key validation issue by simplifying room RLS policies
-- Drop the conflicting SELECT policies on rooms
DROP POLICY IF EXISTS "Room creators can view their own rooms with full details" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can view basic room info for joining" ON public.rooms;

-- Create a single, simple SELECT policy that allows anyone to read rooms
-- This ensures foreign key validation works properly
CREATE POLICY "Allow room access for all operations" 
ON public.rooms 
FOR SELECT 
TO public, anon, authenticated
USING (true);

-- Also ensure we can still create rooms as guests
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
CREATE POLICY "Allow room creation for all users" 
ON public.rooms 
FOR INSERT 
TO public, anon, authenticated
WITH CHECK (true);