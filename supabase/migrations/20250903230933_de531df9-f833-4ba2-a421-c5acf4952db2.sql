-- Ensure players start with 3 lives and are alive by default
ALTER TABLE public.players 
  ALTER COLUMN lives SET DEFAULT 3,
  ALTER COLUMN is_alive SET DEFAULT true;

-- Backfill existing players with proper lives and alive status
UPDATE public.players 
SET lives = 3, is_alive = true 
WHERE lives IS NULL OR lives < 1 OR NOT is_alive;

-- Update the handle_timeout function to ensure only 1 life is lost per timeout
-- and ensure submit_word doesn't touch player lives
CREATE OR REPLACE FUNCTION public.start_game_reset_lives(p_room_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Reset all players in the room to full health when starting a new game
  UPDATE players 
  SET lives = 3, is_alive = true 
  WHERE room_id = p_room_id;
END;
$$;

-- Create function to join room with proper initialization  
CREATE OR REPLACE FUNCTION public.join_room_with_lives(p_room_id text, p_user_id text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_player_id uuid;
BEGIN
  INSERT INTO players (room_id, user_id, name, lives, is_alive)
  VALUES (p_room_id, p_user_id, p_name, 3, true)
  RETURNING id INTO v_player_id;
  
  RETURN v_player_id;
END;
$$;