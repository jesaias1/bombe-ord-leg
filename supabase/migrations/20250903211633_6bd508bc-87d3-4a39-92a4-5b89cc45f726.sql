-- Replace submit_word and handle_timeout to use TEXT room_id instead of UUID
-- This fixes "invalid input syntax for type uuid" errors

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.submit_word(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.handle_timeout(uuid, uuid);
DROP FUNCTION IF EXISTS public.submit_word_by_user(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.handle_timeout_by_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.submit_word_by_code(text, uuid, text);
DROP FUNCTION IF EXISTS public.handle_timeout_by_code(text, uuid);

-- 1) Submit word – TEXT room id + UUID player id
CREATE OR REPLACE FUNCTION public.submit_word(
  p_room_id   text,   -- room code
  p_player_id uuid,
  p_word      text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_current_game   RECORD;
  v_submitting_pl  RECORD;
  v_next_player    RECORD;
  v_next_syllable  text;
  v_new_timer_end  timestamptz;
  v_timer_duration int;
  v_normalized_word text;
  v_word_exists    boolean := FALSE;
  v_rows           int;
BEGIN
  -- Normalize word input
  v_normalized_word := trim(lower(p_word));

  -- lock current game by room code
  SELECT * INTO v_current_game
  FROM games g
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_game IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active game found');
  END IF;

  -- lock submitting player in this room
  SELECT * INTO v_submitting_pl
  FROM players p
  WHERE p.id = p_player_id AND p.room_id = p_room_id
  FOR UPDATE;

  IF v_submitting_pl IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found in room');
  END IF;

  -- must be their turn
  IF v_current_game.current_player_id != v_submitting_pl.id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- Validate word length
  IF length(v_normalized_word) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Ordet skal være mindst 3 bogstaver langt');
  END IF;

  -- word must include current syllable
  IF v_current_game.current_syllable IS NULL OR position(lower(v_current_game.current_syllable) IN v_normalized_word) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Ordet skal indeholde stavelsen "' || v_current_game.current_syllable || '"');
  END IF;

  -- not already used
  IF v_normalized_word = ANY(COALESCE(v_current_game.used_words, ARRAY[]::text[])) THEN
    RETURN json_build_object('success', false, 'error', 'Ordet "' || v_normalized_word || '" er allerede brugt');
  END IF;

  -- Check if word exists in dictionary
  SELECT EXISTS(
    SELECT 1 FROM danish_words dw WHERE dw.word = v_normalized_word
  ) INTO v_word_exists;
  
  IF NOT v_word_exists THEN
    RETURN json_build_object('success', false, 'error', 'Ordet "' || v_normalized_word || '" findes ikke i ordbogen');
  END IF;

  -- rotate to next alive player
  WITH alive AS (
    SELECT * FROM players
    WHERE room_id = p_room_id AND is_alive = true
    ORDER BY turn_order, joined_at
  ), idx AS (
    SELECT id, ROW_NUMBER() OVER () rn FROM alive
  ), cur AS (
    SELECT rn FROM idx WHERE id = v_current_game.current_player_id
  )
  SELECT a.* INTO v_next_player
  FROM alive a
  JOIN idx i ON i.id = a.id
  JOIN cur c ON TRUE
  WHERE i.rn = CASE WHEN c.rn = (SELECT COUNT(*) FROM alive) THEN 1 ELSE c.rn + 1 END;

  -- pick new syllable for room difficulty
  SELECT s.syllable INTO v_next_syllable
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_next_syllable IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No syllable found for room');
  END IF;

  -- timer 10–20s
  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

  UPDATE games g
  SET
    current_player_id = v_next_player.id,
    current_syllable  = v_next_syllable,
    used_words        = CASE WHEN v_normalized_word = ANY(COALESCE(g.used_words, ARRAY[]::text[]))
                             THEN g.used_words
                             ELSE array_append(COALESCE(g.used_words, ARRAY[]::text[]), v_normalized_word)
                        END,
    correct_words     = CASE WHEN v_normalized_word = ANY(COALESCE(g.correct_words, ARRAY[]::text[]))
                             THEN g.correct_words
                             ELSE array_append(COALESCE(g.correct_words, ARRAY[]::text[]), v_normalized_word)
                        END,
    timer_end_time    = v_new_timer_end,
    timer_duration    = v_timer_duration,
    round_number      = COALESCE(g.round_number, 0) + 1,
    updated_at        = now()
  WHERE g.id = v_current_game.id;

  RETURN json_build_object(
    'success', true,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable,
    'word_accepted', v_normalized_word
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$$;

-- 2) Handle timeout – TEXT room id + UUID player id
CREATE OR REPLACE FUNCTION public.handle_timeout(
  p_room_id   text,
  p_player_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_current_game   RECORD;
  v_current_player RECORD;
  v_next_player    RECORD;
  v_next_syllable  text;
  v_new_lives      int;
  v_timer_duration int;
  v_new_timer_end  timestamptz;
  v_alive_count    int;
BEGIN
  SELECT * INTO v_current_game
  FROM games g
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_game IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active game found');
  END IF;

  SELECT * INTO v_current_player
  FROM players p
  WHERE p.id = p_player_id AND p.room_id = p_room_id
  FOR UPDATE;

  IF v_current_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found in room');
  END IF;

  -- must be current player
  IF v_current_game.current_player_id != v_current_player.id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- decrement HP only on timeout
  v_new_lives := GREATEST(0, v_current_player.lives - 1);
  UPDATE players SET lives = v_new_lives, is_alive = (v_new_lives > 0)
  WHERE id = v_current_player.id;

  -- players left alive?
  SELECT COUNT(*) INTO v_alive_count
  FROM players p
  WHERE p.room_id = p_room_id AND p.is_alive = true;

  IF v_alive_count <= 1 THEN
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = now()
    WHERE g.id = v_current_game.id;

    RETURN json_build_object(
      'success', false,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true
    );
  END IF;

  -- pick next player round-robin
  WITH alive AS (
    SELECT * FROM players
    WHERE room_id = p_room_id AND is_alive = true
    ORDER BY turn_order, joined_at
  ), idx AS (
    SELECT id, ROW_NUMBER() OVER () rn FROM alive
  ), cur AS (
    SELECT rn FROM idx WHERE id = v_current_game.current_player_id
  )
  SELECT a.* INTO v_next_player
  FROM alive a
  JOIN idx i ON i.id = a.id
  JOIN cur c ON TRUE
  WHERE i.rn = CASE WHEN c.rn = (SELECT COUNT(*) FROM alive) THEN 1 ELSE c.rn + 1 END;

  -- new syllable
  SELECT s.syllable INTO v_next_syllable
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_next_syllable IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No syllable found for room');
  END IF;

  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

  UPDATE games g
  SET current_player_id = v_next_player.id,
      current_syllable  = v_next_syllable,
      timer_end_time    = v_new_timer_end,
      timer_duration    = v_timer_duration,
      updated_at        = now()
  WHERE g.id = v_current_game.id;

  RETURN json_build_object(
    'success', false,
    'timeout', true,
    'lives_remaining', v_new_lives,
    'player_eliminated', (v_new_lives = 0),
    'game_ended', false,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$$;