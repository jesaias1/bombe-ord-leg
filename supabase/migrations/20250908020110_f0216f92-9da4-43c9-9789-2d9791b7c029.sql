-- Update submit_word function to add 1200ms lead-in
CREATE OR REPLACE FUNCTION public.submit_word(p_room_id text, p_player_id uuid, p_word text, p_turn_seq integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game            RECORD;
  v_me              RECORD;
  v_next_player     RECORD;
  v_next_syllable   text;
  v_word            text;
  v_timer_duration  int;
  v_lead_ms         int := 1200;  -- Lead-in to absorb network + render delay
  v_new_timer_end   timestamptz;
  v_turn_seq_start  int;
  v_rows            int;
  v_word_exists     boolean := FALSE;
BEGIN
  -- lock game in this room
  SELECT * INTO v_game
  FROM games g
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_game IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active game');
  END IF;

  -- **Stale protection**: if client submitted for an older turn, ignore silently
  IF COALESCE(v_game.turn_seq,0) <> COALESCE(p_turn_seq, -1) THEN
    RETURN json_build_object('success', false, 'ignored', true, 'error', 'Stale submission');
  END IF;

  -- lock player
  SELECT * INTO v_me
  FROM players p
  WHERE p.id = p_player_id AND p.room_id = p_room_id
  FOR UPDATE;

  IF v_me IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- must be your turn
  IF v_game.current_player_id <> v_me.id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- normalize word and validate ONLY against the **current** syllable
  v_word := trim(lower(p_word));

  -- Validate word length
  IF length(v_word) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Ordet skal være mindst 3 bogstaver langt');
  END IF;

  IF v_game.current_syllable IS NULL
     OR position(lower(v_game.current_syllable) IN v_word) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Ordet skal indeholde stavelsen "' || v_game.current_syllable || '"');
  END IF;

  IF v_word = ANY(COALESCE(v_game.used_words, ARRAY[]::text[])) THEN
    RETURN json_build_object('success', false, 'error', 'Ordet "' || v_word || '" er allerede brugt');
  END IF;

  -- Check if word exists in dictionary
  SELECT EXISTS(
    SELECT 1 FROM danish_words dw WHERE dw.word = v_word
  ) INTO v_word_exists;
  
  IF NOT v_word_exists THEN
    -- Track incorrect word (contains syllable but not in dictionary)
    v_turn_seq_start := COALESCE(v_game.turn_seq,0);
    
    UPDATE games g
    SET incorrect_words = CASE 
                           WHEN v_word = ANY(COALESCE(g.incorrect_words, ARRAY[]::text[]))
                           THEN g.incorrect_words
                           ELSE array_append(COALESCE(g.incorrect_words, ARRAY[]::text[]), v_word)
                         END,
        updated_at = now()
    WHERE g.id = v_game.id
      AND COALESCE(g.turn_seq,0) = v_turn_seq_start;
    
    RETURN json_build_object('success', false, 'error', 'Ordet "' || v_word || '" findes ikke i ordbogen');
  END IF;

  -- rotate to next alive
  WITH alive AS (
    SELECT * FROM players
    WHERE room_id = p_room_id AND is_alive = true
    ORDER BY turn_order, joined_at
  ), idx AS (
    SELECT id, ROW_NUMBER() OVER () rn FROM alive
  ), cur AS (
    SELECT rn FROM idx WHERE id = v_game.current_player_id
  )
  SELECT a.* INTO v_next_player
  FROM alive a
  JOIN idx i ON i.id = a.id
  JOIN cur c ON true
  WHERE i.rn = CASE WHEN c.rn = (SELECT COUNT(*) FROM alive)
                    THEN 1 ELSE c.rn + 1 END;

  -- Improved syllable selection with variety
  WITH pool AS (
    SELECT s.syllable, char_length(s.syllable) AS len
    FROM syllables s
    JOIN rooms r ON r.id = p_room_id
    WHERE s.difficulty = r.difficulty
      AND s.syllable <> v_game.current_syllable
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
  ) INTO v_next_syllable;

  IF v_next_syllable IS NULL THEN
    v_next_syllable := 'ka';
    RAISE NOTICE 'Using fallback syllable: %', v_next_syllable;
  END IF;

  v_timer_duration := 10 + floor(random() * 11)::int;
  
  -- Add lead-in before timer starts counting down
  v_new_timer_end := now() 
    + make_interval(secs => v_timer_duration)
    + (v_lead_ms || ' milliseconds')::interval;

  v_turn_seq_start := COALESCE(v_game.turn_seq,0);

  UPDATE games g
  SET current_player_id = v_next_player.id,
      current_syllable  = v_next_syllable,
      used_words        = CASE WHEN v_word = ANY(COALESCE(g.used_words, ARRAY[]::text[]))
                               THEN g.used_words
                               ELSE array_append(COALESCE(g.used_words, ARRAY[]::text[]), v_word)
                          END,
      correct_words     = CASE WHEN v_word = ANY(COALESCE(g.correct_words, ARRAY[]::text[]))
                               THEN g.correct_words
                               ELSE array_append(COALESCE(g.correct_words, ARRAY[]::text[]), v_word)
                          END,
      timer_end_time    = v_new_timer_end,
      timer_duration    = v_timer_duration,
      round_number      = COALESCE(g.round_number,0) + 1,
      turn_seq          = COALESCE(g.turn_seq,0) + 1,
      updated_at        = now()
  WHERE g.id = v_game.id
    AND COALESCE(g.turn_seq,0) = v_turn_seq_start;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('success', false, 'ignored', true, 'error', 'Turn already advanced');
  END IF;

  -- Push realtime notification
  PERFORM pg_notify('room_updates', p_room_id);

  RETURN json_build_object(
    'success', true,
    'word_accepted', v_word,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable,
    'current_player_id', v_next_player.id,
    'current_player_name', v_next_player.name,
    'current_syllable', v_next_syllable,
    'timer_end_time', v_new_timer_end,
    'timer_duration', v_timer_duration,
    'turn_seq', COALESCE(v_game.turn_seq, 0) + 1
  );
END;
$function$;

-- Update handle_timeout function to add 1200ms lead-in
CREATE OR REPLACE FUNCTION public.handle_timeout(p_room_id text, p_player_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_game   RECORD;
  v_current_player RECORD;
  v_next_player    RECORD;
  v_next_syllable  text;
  v_new_lives      int;
  v_timer_duration int;
  v_lead_ms        int := 1200;  -- Lead-in to absorb network + render delay
  v_new_timer_end  timestamptz;
  v_alive_count    int;
  v_total_players  int;
  v_remaining      uuid;
  v_new_turn_seq   int;
BEGIN
  -- Get current game
  SELECT * INTO v_current_game
  FROM games g
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_game IS NULL THEN
    RAISE NOTICE 'No active game found for room %', p_room_id;
    RETURN json_build_object('success', false, 'error', 'No active game found');
  END IF;

  -- Get current player
  SELECT * INTO v_current_player
  FROM players p
  WHERE p.id = p_player_id AND p.room_id = p_room_id
  FOR UPDATE;

  IF v_current_player IS NULL THEN
    RAISE NOTICE 'Player % not found in room %', p_player_id, p_room_id;
    RETURN json_build_object('success', false, 'error', 'Player not found in room');
  END IF;

  -- Verify it's the current player's turn
  IF v_current_game.current_player_id != v_current_player.id THEN
    RAISE NOTICE 'Not current player turn. Expected: %, Got: %', v_current_game.current_player_id, v_current_player.id;
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;

  RAISE NOTICE 'TIMEOUT - Player % (%): lives before = %', v_current_player.name, v_current_player.id, v_current_player.lives;

  -- Decrement lives and update alive status
  v_new_lives := GREATEST(0, v_current_player.lives - 1);
  UPDATE players 
  SET lives = v_new_lives, is_alive = (v_new_lives > 0)
  WHERE id = v_current_player.id;

  RAISE NOTICE 'TIMEOUT - Player % (%): lives after = %, is_alive = %', v_current_player.name, v_current_player.id, v_new_lives, (v_new_lives > 0);

  -- Count players AFTER applying this timeout
  SELECT COUNT(*) INTO v_total_players FROM players WHERE room_id = p_room_id;
  SELECT COUNT(*) INTO v_alive_count FROM players WHERE room_id = p_room_id AND is_alive = true;

  RAISE NOTICE 'TIMEOUT - Room stats: total_players = %, alive_count = %', v_total_players, v_alive_count;

  -- END CONDITIONS: Check if game should end
  IF (v_total_players = 1 AND v_new_lives = 0) OR (v_total_players > 1 AND v_alive_count <= 1) THEN
    -- Determine winner for multiplayer games
    IF v_total_players > 1 AND v_alive_count = 1 THEN
      SELECT id INTO v_remaining FROM players WHERE room_id = p_room_id AND is_alive = true LIMIT 1;
    ELSE
      v_remaining := NULL; -- Training / no winner case
    END IF;

    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        winner_player_id = v_remaining,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;

    -- Push realtime notification
    PERFORM pg_notify('room_updates', p_room_id);

    RAISE NOTICE 'GAME ENDED - single_player: %, lives: %, total: %, alive: %, winner: %', 
      (v_total_players = 1), v_new_lives, v_total_players, v_alive_count, v_remaining;

    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true,
      'winner_player_id', v_remaining
    );
  END IF;

  -- Continue game: find next alive player
  WITH alive AS (
    SELECT * FROM players
    WHERE room_id = p_room_id AND is_alive = true
    ORDER BY turn_order NULLS LAST, joined_at
  ), indexed AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive
  ), current_pos AS (
    SELECT rn FROM indexed WHERE id = v_current_game.current_player_id
  )
  SELECT a.* INTO v_next_player
  FROM alive a
  JOIN indexed i ON i.id = a.id
  LEFT JOIN current_pos c ON TRUE
  WHERE i.rn = CASE WHEN c.rn IS NULL OR c.rn = (SELECT COUNT(*) FROM alive) 
                   THEN 1 
                   ELSE c.rn + 1 
              END;

  IF v_next_player IS NULL THEN
    -- No alive players found, end game
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        winner_player_id = NULL,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;
    
    -- Push realtime notification
    PERFORM pg_notify('room_updates', p_room_id);
    
    RAISE NOTICE 'GAME ENDED - No next player found';
    
    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true,
      'winner_player_id', NULL
    );
  END IF;

  -- Improved syllable selection with variety
  WITH pool AS (
    SELECT s.syllable, char_length(s.syllable) AS len
    FROM syllables s
    JOIN rooms r ON r.id = p_room_id
    WHERE s.difficulty = r.difficulty
      AND s.syllable <> v_current_game.current_syllable
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
  ) INTO v_next_syllable;

  IF v_next_syllable IS NULL THEN
    -- Fallback syllable
    v_next_syllable := 'ka';
    RAISE NOTICE 'Using fallback syllable: %', v_next_syllable;
  END IF;

  -- Set new timer with lead-in
  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() 
    + make_interval(secs => v_timer_duration)
    + (v_lead_ms || ' milliseconds')::interval;
  v_new_turn_seq := COALESCE(v_current_game.turn_seq, 0) + 1;

  -- Update game state
  UPDATE games g
  SET current_player_id = v_next_player.id,
      current_syllable = v_next_syllable,
      timer_end_time = v_new_timer_end,
      timer_duration = v_timer_duration,
      turn_seq = v_new_turn_seq,
      updated_at = now()
  WHERE g.id = v_current_game.id;

  -- Push realtime notification
  PERFORM pg_notify('room_updates', p_room_id);

  RAISE NOTICE 'GAME CONTINUES - Next player: % (%), syllable: %', 
    v_next_player.name, v_next_player.id, v_next_syllable;

  RETURN json_build_object(
    'success', true,
    'timeout', true,
    'lives_remaining', v_new_lives,
    'player_eliminated', (v_new_lives = 0),
    'game_ended', false,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable,
    'current_player_id', v_next_player.id,
    'current_player_name', v_next_player.name,
    'current_syllable', v_next_syllable,
    'timer_end_time', v_new_timer_end,
    'timer_duration', v_timer_duration,
    'turn_seq', v_new_turn_seq
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'TIMEOUT ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$function$;

-- Update start_new_game function to add 1200ms lead-in
CREATE OR REPLACE FUNCTION public.start_new_game(p_room_id text, p_user_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room           rooms%ROWTYPE;
  v_first_player   uuid;
  v_next_syllable  text;
  v_timer          int;
  v_lead_ms        int := 1200;  -- Lead-in to absorb network + render delay
  v_timer_end      timestamptz;
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
  
  -- Add lead-in before timer starts counting down
  v_timer_end := now() 
    + make_interval(secs => v_timer)
    + (v_lead_ms || ' milliseconds')::interval;

  INSERT INTO games(
    room_id, status, current_player_id, current_syllable,
    timer_duration, timer_end_time,
    used_words, correct_words, incorrect_words, round_number
  ) VALUES (
    p_room_id, 'playing', v_first_player, v_next_syllable,
    v_timer, v_timer_end,
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
$function$;