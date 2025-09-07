-- Update handle_timeout to add realtime notification
CREATE OR REPLACE FUNCTION public.handle_timeout(p_room_id text, p_player_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_game   RECORD;
  v_current_player RECORD;
  v_next_player    RECORD;
  v_next_syllable  text;
  v_new_lives      int;
  v_timer_duration int;
  v_new_timer_end  timestamptz;
  v_alive_count    int;
  v_total_players  int;
  v_remaining      uuid;
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

  -- Set new timer
  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

  -- Update game state
  UPDATE games g
  SET current_player_id = v_next_player.id,
      current_syllable = v_next_syllable,
      timer_end_time = v_new_timer_end,
      timer_duration = v_timer_duration,
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
    'next_syllable', v_next_syllable
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'TIMEOUT ERROR: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$function$;