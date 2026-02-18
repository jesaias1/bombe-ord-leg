-- ✅ Fix: remove recursive RLS on players and add safe policies
-- 0) Make sure RLS is on
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 1) Drop ALL existing policies on players (some may be recursive)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'players'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.players;', pol.policyname);
  END LOOP;
END$$;

-- 2) Helper: is current user the room creator? (no recursion; reads rooms only)
CREATE OR REPLACE FUNCTION public.is_room_creator(p_room_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms r
    WHERE r.id = p_room_id
      AND r.creator_id = auth.uid()::text
  );
$fn$;

-- 3) Helper: is current user a member of the room?
-- This reads players, but runs as SECURITY DEFINER so it DOES NOT recurse.
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id text, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.room_id = p_room_id
      AND p.user_id = p_user_id::text
  );
$fn$;

-- 4) Ensure helpers are owned by a superuser/owner so they bypass RLS
-- (Supabase usually uses 'postgres' as owner; adjust if needed)
ALTER FUNCTION public.is_room_creator(text) OWNER TO postgres;
ALTER FUNCTION public.is_room_member(text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_room_creator(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(text, uuid) TO authenticated, anon;

-- 5) Policies (non-recursive)

-- Read: you can read (a) your own player row, (b) any player in rooms
-- where you are a member, or (c) any player if you are the room creator.
CREATE POLICY players_select_safe
ON public.players
FOR SELECT
TO authenticated, anon
USING (
  user_id = auth.uid()::text
  OR public.is_room_member(room_id)     -- SECURITY DEFINER, no recursion
  OR public.is_room_creator(room_id)     -- creator can see all in room
);

-- Insert: you may insert your own player row.
-- (Guest/anon still allowed if they set user_id to their session id string.)
CREATE POLICY players_insert_self
ON public.players
FOR INSERT
TO authenticated, anon
WITH CHECK (
  user_id = auth.uid()::text
);

-- Update: you may update your own player row, or any row if you are room creator.
CREATE POLICY players_update_safe
ON public.players
FOR UPDATE
TO authenticated, anon
USING (
  user_id = auth.uid()::text OR public.is_room_creator(room_id)
)
WITH CHECK (
  user_id = auth.uid()::text OR public.is_room_creator(room_id)
);

-- Delete (optional): you may delete your own row, or creator may remove players.
CREATE POLICY players_delete_safe
ON public.players
FOR DELETE
TO authenticated, anon
USING (
  user_id = auth.uid()::text OR public.is_room_creator(room_id)
);

-- ✅ Also make sure the game-start RPC runs with RLS bypass
-- Ensure start_new_game runs as SECURITY DEFINER so RLS on players/games doesn't block it
CREATE OR REPLACE FUNCTION public.start_new_game(p_room_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_first_player RECORD;
  v_new_syllable text;
  v_timer_duration int;
  v_new_timer_end timestamptz;
  v_new_game_id uuid;
BEGIN
  -- End any existing playing games for the room
  UPDATE games 
  SET status = 'finished', updated_at = now()
  WHERE room_id = p_room_id AND status = 'playing';

  -- Reset all players in the room to full health
  UPDATE players 
  SET lives = 3, is_alive = true 
  WHERE room_id = p_room_id;

  -- Find first alive player by turn_order, joined_at
  SELECT * INTO v_first_player
  FROM players
  WHERE room_id = p_room_id AND is_alive = true
  ORDER BY turn_order NULLS LAST, joined_at ASC
  LIMIT 1;

  IF v_first_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No players found in room');
  END IF;

  -- Pick initial syllable with variety logic
  WITH pool AS (
    SELECT s.syllable, char_length(s.syllable) AS len
    FROM syllables s
    JOIN rooms r ON r.id = p_room_id
    WHERE s.difficulty = r.difficulty
      AND s.word_count >= 5
  ),
  choice AS (
    SELECT syllable
    FROM pool
    WHERE (CASE WHEN random() < 0.6 THEN len = 2 ELSE len = 3 END)
    ORDER BY random()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT syllable FROM choice),
    (SELECT syllable FROM pool ORDER BY random() LIMIT 1),
    'ka'
  ) INTO v_new_syllable;

  -- Set timer duration (10-20 seconds)
  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

  -- Create fresh game
  INSERT INTO games (
    room_id,
    status,
    current_player_id,
    current_syllable,
    timer_duration,
    timer_end_time,
    round_number,
    turn_seq,
    used_words,
    correct_words,
    incorrect_words,
    created_at,
    updated_at
  ) VALUES (
    p_room_id,
    'playing',
    v_first_player.id,
    v_new_syllable,
    v_timer_duration,
    v_new_timer_end,
    1,
    0,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    now(),
    now()
  ) RETURNING id INTO v_new_game_id;

  RAISE NOTICE 'Created new game % with first player % (%) and syllable %', 
    v_new_game_id, v_first_player.name, v_first_player.id, v_new_syllable;

  RETURN json_build_object(
    'success', true,
    'next_player', v_first_player.name,
    'next_syllable', v_new_syllable,
    'game_id', v_new_game_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'START_NEW_GAME ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$function$;

-- Make sure function owner bypasses RLS
ALTER FUNCTION public.start_new_game(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.start_new_game(text) TO authenticated, anon;