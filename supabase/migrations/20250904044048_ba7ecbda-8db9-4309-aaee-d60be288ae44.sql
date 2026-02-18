-- Create start_new_game RPC function
CREATE OR REPLACE FUNCTION public.start_new_game(p_room_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$