-- Fix multiple critical issues with game lifecycle and lives management

-- First, fix the start_game_reset_lives function to properly reset lives
CREATE OR REPLACE FUNCTION public.start_game_reset_lives(p_room_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reset all players in the room to full health when starting a new game
  UPDATE players 
  SET lives = 3, is_alive = true 
  WHERE room_id = p_room_id;
  
  -- Also terminate any existing games in the room
  UPDATE games 
  SET status = 'finished'
  WHERE room_id = p_room_id AND status = 'playing';
  
  RAISE NOTICE 'Reset lives for all players in room % to 3 lives', p_room_id;
END;
$function$;

-- Fix the join_room_with_lives function to ensure proper initial lives
CREATE OR REPLACE FUNCTION public.join_room_with_lives(p_room_id text, p_user_id text, p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_player_id uuid;
  v_existing_player_id uuid;
BEGIN
  -- Check if player already exists in room
  SELECT id INTO v_existing_player_id
  FROM players 
  WHERE room_id = p_room_id AND user_id = p_user_id;
  
  -- If player already exists, just update their lives and return existing id
  IF v_existing_player_id IS NOT NULL THEN
    UPDATE players 
    SET lives = 3, is_alive = true, name = p_name
    WHERE id = v_existing_player_id;
    
    RAISE NOTICE 'Updated existing player % with 3 lives', v_existing_player_id;
    RETURN v_existing_player_id;
  END IF;
  
  -- Create new player with 3 lives
  INSERT INTO players (room_id, user_id, name, lives, is_alive)
  VALUES (p_room_id, p_user_id, p_name, 3, true)
  RETURNING id INTO v_player_id;
  
  RAISE NOTICE 'Created new player % with 3 lives', v_player_id;
  RETURN v_player_id;
END;
$function$;

-- Enhanced handle_timeout with better logging and single-player logic
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
  v_new_timer_end  timestamptz;
  v_alive_count    int;
  v_total_players  int;
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
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;

    RAISE NOTICE 'GAME ENDED - single_player: %, lives: %, total: %, alive: %', 
      (v_total_players = 1), v_new_lives, v_total_players, v_alive_count;

    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true
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
        updated_at = NOW()
    WHERE g.id = v_current_game.id;
    
    RAISE NOTICE 'GAME ENDED - No next player found';
    
    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true
    );
  END IF;

  -- Get new syllable
  SELECT s.syllable INTO v_next_syllable
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM()
  LIMIT 1;

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