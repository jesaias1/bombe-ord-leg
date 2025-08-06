-- Update the games table policy to allow guest users to create games too
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;

-- Create new policy that allows both authenticated and guest users
CREATE POLICY "Users can create games" 
ON games 
FOR INSERT 
WITH CHECK (true);