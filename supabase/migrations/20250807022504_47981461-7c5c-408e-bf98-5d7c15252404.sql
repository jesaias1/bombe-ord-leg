-- Convert players.user_id from text to uuid to match profiles.user_id
ALTER TABLE public.players 
ALTER COLUMN user_id TYPE UUID USING user_id::uuid;