-- Drop existing policies that use guest_% pattern
DROP POLICY IF EXISTS "Players can view room players" ON players;
DROP POLICY IF EXISTS "Users can create player records" ON players;
DROP POLICY IF EXISTS "Users can delete their own player records" ON players;
DROP POLICY IF EXISTS "Users can update their own player data" ON players;

-- Create new policies that work with both authenticated and guest users
CREATE POLICY "Anyone can view players in rooms they're part of" 
ON players 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create player records" 
ON players 
FOR INSERT 
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own player data" 
ON players 
FOR UPDATE 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own player records" 
ON players 
FOR DELETE 
USING (user_id = (auth.uid())::text);