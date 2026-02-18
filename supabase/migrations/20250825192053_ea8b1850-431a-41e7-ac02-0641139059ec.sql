-- Create a function to check if current user is room creator
CREATE OR REPLACE FUNCTION public.is_room_creator(room_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND creator_id = (auth.uid())::text
  );
$$;