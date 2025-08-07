-- Add foreign key constraint from players to profiles via user_id
ALTER TABLE public.players 
ADD CONSTRAINT players_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;