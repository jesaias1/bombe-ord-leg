-- Temporarily allow all operations on players table for debugging
DROP POLICY IF EXISTS "Anyone can view players in rooms they're part of" ON players;
DROP POLICY IF EXISTS "Users can create player records" ON players;
DROP POLICY IF EXISTS "Users can update their own player data" ON players;
DROP POLICY IF EXISTS "Users can delete their own player records" ON players;

-- Create very permissive policies for debugging
CREATE POLICY "Allow all operations on players" 
ON players 
FOR ALL 
USING (true)
WITH CHECK (true);