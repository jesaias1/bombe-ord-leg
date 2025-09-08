-- Remove old variants that enforced "ready" (ignore if they don't exist)
DROP FUNCTION IF EXISTS public.start_game(text);
DROP FUNCTION IF EXISTS public.start_multiplayer_game(text,text);

-- Create/replace authoritative start_new_game function (host-only, no ready checks)
CREATE OR REPLACE FUNCTION public.start_new_game(
  p_room_id text,
  p_user_id text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_room           rooms%ROWTYPE;
  v_first_player   uuid;
  v_next_syllable  text;
  v_timer          int;
  v_game           games%ROWTYPE;
BEGIN
  -- Lock room row and verify host
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;
  IF v_room IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Room not found');
  END IF;

  -- Host only
  IF v_room.creator_id IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Only host can start');
  END IF;

  -- Reset all players to alive/3 lives for a fresh round (no "ready" logic)
  UPDATE players
  SET lives = 3,
      is_alive = true
  WHERE room_id = p_room_id;

  -- Clean up any running game
  UPDATE games
  SET status='finished', updated_at=now()
  WHERE room_id=p_room_id AND status='playing';

  -- Pick first alive by turn_order/joined_at
  SELECT id INTO v_first_player
  FROM players
  WHERE room_id=p_room_id AND is_alive = true
  ORDER BY turn_order NULLS LAST, joined_at
  LIMIT 1;

  IF v_first_player IS NULL THEN
    RETURN json_build_object('success', true, 'empty', true);
  END IF;

  -- New syllable by room difficulty
  SELECT s.syllable INTO v_next_syllable
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id
  WHERE s.difficulty = r.difficulty
    AND s.word_count >= 5
  ORDER BY random() LIMIT 1;

  IF v_next_syllable IS NULL THEN v_next_syllable := 'ka'; END IF;

  v_timer := 10 + floor(random()*11)::int;

  INSERT INTO games(
    room_id, status, current_player_id, current_syllable,
    timer_duration, timer_end_time,
    used_words, correct_words, incorrect_words, round_number
  ) VALUES (
    p_room_id, 'playing', v_first_player, v_next_syllable,
    v_timer, now() + (v_timer || ' seconds')::interval,
    ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[], 1
  ) RETURNING * INTO v_game;

  -- realtime nudge (optional)
  PERFORM pg_notify('realtime', 'game_started:' || p_room_id);

  RETURN json_build_object(
    'success', true,
    'next_player', v_first_player::text,
    'next_syllable', v_next_syllable
  );
END;
$$;