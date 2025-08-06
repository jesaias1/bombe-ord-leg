-- Phase 1: Create proper user roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Phase 2: Fix overly permissive RLS policies

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can delete games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;

DROP POLICY IF EXISTS "Anyone can create players" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.players;
DROP POLICY IF EXISTS "Anyone can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can join as players" ON public.players;
DROP POLICY IF EXISTS "Everyone can view players" ON public.players;

-- Create secure RLS policies for games
CREATE POLICY "Room players can view games"
ON public.games
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE room_id = games.room_id 
    AND (user_id = (auth.uid())::text OR user_id LIKE 'guest_%')
  )
);

CREATE POLICY "Authenticated users can create games"
ON public.games
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Room players can update games"
ON public.games
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE room_id = games.room_id 
    AND (user_id = (auth.uid())::text OR user_id LIKE 'guest_%')
  )
);

CREATE POLICY "Admins can delete games"
ON public.games
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create secure RLS policies for players
CREATE POLICY "Players can view room players"
ON public.players
FOR SELECT
USING (
  user_id = (auth.uid())::text 
  OR user_id LIKE 'guest_%'
  OR EXISTS (
    SELECT 1 FROM public.players p2 
    WHERE p2.room_id = players.room_id 
    AND p2.user_id = (auth.uid())::text
  )
);

CREATE POLICY "Users can create player records"
ON public.players
FOR INSERT
WITH CHECK (
  user_id = (auth.uid())::text 
  OR user_id LIKE 'guest_%'
);

CREATE POLICY "Users can update their own player data"
ON public.players
FOR UPDATE
USING (
  user_id = (auth.uid())::text 
  OR user_id LIKE 'guest_%'
);

CREATE POLICY "Users can delete their own player records"
ON public.players
FOR DELETE
USING (
  user_id = (auth.uid())::text 
  OR user_id LIKE 'guest_%'
);

CREATE POLICY "Admins can manage all players"
ON public.players
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix submit_word function security issues
CREATE OR REPLACE FUNCTION public.submit_word(p_room_id text, p_user_id text, p_word text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_game_id UUID;
  v_current_player_id UUID;
  v_current_syllable TEXT;
  v_used_words TEXT[];
  v_player_id UUID;
  v_next_player_id UUID;
  v_alive_players UUID[];
  v_syllable_count INTEGER;
BEGIN
  -- Input validation
  IF p_word IS NULL OR LENGTH(TRIM(p_word)) = 0 THEN
    RAISE EXCEPTION 'Word cannot be empty';
  END IF;
  
  IF LENGTH(p_word) > 50 THEN
    RAISE EXCEPTION 'Word too long';
  END IF;
  
  -- Get the current game for this room
  SELECT id, current_player_id, current_syllable, used_words, status
  INTO v_game_id, v_current_player_id, v_current_syllable, v_used_words
  FROM games 
  WHERE room_id = p_room_id AND status = 'playing';
  
  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'No active game found for this room';
  END IF;
  
  -- Get the player ID for this user
  SELECT id INTO v_player_id 
  FROM players 
  WHERE room_id = p_room_id AND user_id = p_user_id AND is_alive = true;
  
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found or not alive';
  END IF;
  
  -- Check if it's the player's turn
  IF v_current_player_id != v_player_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Check if word contains the current syllable
  IF NOT (LOWER(p_word) LIKE '%' || LOWER(v_current_syllable) || '%') THEN
    RAISE EXCEPTION 'Word does not contain the required syllable: %', v_current_syllable;
  END IF;
  
  -- Check if word has already been used
  IF p_word = ANY(v_used_words) THEN
    RAISE EXCEPTION 'Word already used: %', p_word;
  END IF;
  
  -- Check if word exists in dictionary (basic validation)
  SELECT COUNT(*) INTO v_syllable_count
  FROM danish_words 
  WHERE LOWER(word) = LOWER(p_word);
  
  IF v_syllable_count = 0 THEN
    RAISE EXCEPTION 'Word not valid: %', p_word;
  END IF;
  
  -- Add word to used words
  v_used_words := array_append(v_used_words, p_word);
  
  -- Get next alive player
  SELECT ARRAY(
    SELECT id 
    FROM players 
    WHERE room_id = p_room_id AND is_alive = true 
    ORDER BY joined_at
  ) INTO v_alive_players;
  
  -- Find next player in rotation
  FOR i IN 1..array_length(v_alive_players, 1) LOOP
    IF v_alive_players[i] = v_current_player_id THEN
      IF i = array_length(v_alive_players, 1) THEN
        v_next_player_id := v_alive_players[1];
      ELSE
        v_next_player_id := v_alive_players[i + 1];
      END IF;
      EXIT;
    END IF;
  END LOOP;
  
  -- Generate new syllable from syllables table
  SELECT syllable INTO v_current_syllable
  FROM syllables 
  WHERE difficulty = (SELECT difficulty FROM rooms WHERE id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  -- Update the game with new state
  UPDATE games 
  SET 
    current_player_id = v_next_player_id,
    current_syllable = v_current_syllable,
    used_words = v_used_words,
    timer_end_time = NOW() + INTERVAL '15 seconds',
    updated_at = NOW()
  WHERE id = v_game_id;
  
  RETURN TRUE;
END;
$function$;

-- Add RLS policy for danish_words to allow admin management
CREATE POLICY "Admins can manage words"
ON public.danish_words
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add rate limiting table for submit_word function
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, action, created_at)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (user_id = (auth.uid())::text OR user_id LIKE 'guest_%');

-- Add index for rate limiting queries
CREATE INDEX idx_rate_limits_user_action_time ON public.rate_limits (user_id, action, created_at);

-- Insert admin role for the current admin email (temporary until proper role assignment)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'lin4s@live.dk'
ON CONFLICT (user_id, role) DO NOTHING;