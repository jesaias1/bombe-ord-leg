-- Fix ambiguous column reference errors in submit_word and handle_timeout functions
-- Rename local variables with v_ prefix and qualify all table columns

DROP FUNCTION IF EXISTS public.submit_word(p_room_id text, p_user_id text, p_word text);

CREATE OR REPLACE FUNCTION public.submit_word(p_room_id text, p_user_id text, p_word text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_game RECORD;
  v_current_player RECORD;
  v_submitting_player RECORD;
  v_word_exists BOOLEAN := FALSE;
  v_next_player RECORD;
  v_next_syllable TEXT;
  v_timer_duration INT;
  v_new_timer_end TIMESTAMP WITH TIME ZONE;
  v_word_is_valid BOOLEAN := TRUE;
  v_error_message TEXT := '';
  v_new_lives INT;
BEGIN
  -- Get current game with row lock for atomic operations
  SELECT * INTO v_current_game 
  FROM games g 
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1
  FOR UPDATE;
  
  IF v_current_game IS NULL THEN
    RAISE EXCEPTION 'No active game found for room %', p_room_id;
  END IF;
  
  -- Get submitting player with row lock
  SELECT * INTO v_submitting_player 
  FROM players p 
  WHERE p.room_id = p_room_id AND p.user_id = p_user_id
  FOR UPDATE;
  
  IF v_submitting_player IS NULL THEN
    RAISE EXCEPTION 'Player not found in room';
  END IF;
  
  -- Check if it's the player's turn
  IF v_current_game.current_player_id != v_submitting_player.id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Validate word and set error flags instead of raising exceptions immediately
  IF length(trim(p_word)) < 3 THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Word must be at least 3 characters long';
  ELSIF position(lower(v_current_game.current_syllable) IN lower(trim(p_word))) = 0 THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Word does not contain syllable ' || v_current_game.current_syllable;
  ELSIF trim(lower(p_word)) = ANY(v_current_game.used_words) THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Word already used: ' || trim(p_word);
  ELSE
    -- Check if word exists in dictionary
    SELECT EXISTS(SELECT 1 FROM danish_words dw WHERE dw.word = trim(lower(p_word))) INTO v_word_exists;
    IF NOT v_word_exists THEN
      v_word_is_valid := FALSE;
      v_error_message := 'Word not valid: ' || trim(p_word);
    END IF;
  END IF;

  -- If word is invalid, decrement HP and handle consequences
  IF NOT v_word_is_valid THEN
    -- Decrement player's lives
    v_new_lives := GREATEST(0, v_submitting_player.lives - 1);
    
    UPDATE players p
    SET lives = v_new_lives,
        is_alive = (v_new_lives > 0)
    WHERE p.id = v_submitting_player.id;
    
    -- Add word to incorrect_words if it was provided
    IF trim(p_word) != '' THEN
      UPDATE games g
      SET incorrect_words = array_append(COALESCE(g.incorrect_words, ARRAY[]::text[]), trim(lower(p_word)))
      WHERE g.id = v_current_game.id;
    END IF;
    
    -- Check if player is now dead or if game should end
    IF v_new_lives = 0 THEN
      -- Player is dead, check remaining alive players
      IF (SELECT COUNT(*) FROM players p WHERE p.room_id = p_room_id AND p.is_alive = true AND p.id != v_submitting_player.id) <= 1 THEN
        -- Game over - only 1 or fewer players remain
        UPDATE games g
        SET status = 'finished',
            current_player_id = NULL,
            timer_end_time = NULL,
            current_syllable = NULL,
            updated_at = NOW()
        WHERE g.id = v_current_game.id;
        
        RETURN json_build_object(
          'success', false,
          'error', v_error_message,
          'lives_remaining', v_new_lives,
          'player_eliminated', true,
          'game_ended', true
        );
      END IF;
    END IF;
    
    -- Continue game with next alive player
    WITH alive_players AS (
      SELECT * FROM players p
      WHERE p.room_id = p_room_id AND p.is_alive = true 
      ORDER BY p.turn_order, p.joined_at
    ),
    indexed_players AS (
      SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
    ),
    current_index AS (
      SELECT rn FROM indexed_players WHERE id = v_current_game.current_player_id
    )
    SELECT ap.* INTO v_next_player
    FROM alive_players ap, indexed_players ip, current_index ci
    WHERE ip.id = ap.id 
    AND ip.rn = CASE 
      WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
      ELSE ci.rn + 1 
    END;
    
    -- If current player is dead, start from first alive player
    IF v_new_lives = 0 THEN
      SELECT * INTO v_next_player FROM players p
      WHERE p.room_id = p_room_id AND p.is_alive = true 
      ORDER BY p.turn_order, p.joined_at 
      LIMIT 1;
    END IF;
    
    -- Get new syllable
    SELECT s.syllable INTO v_next_syllable 
    FROM syllables s
    WHERE s.difficulty = (SELECT r.difficulty FROM rooms r WHERE r.id = p_room_id)
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Calculate timer (10-20 seconds)
    v_timer_duration := 10 + floor(random() * 11)::INT;
    v_new_timer_end := NOW() + (v_timer_duration || ' seconds')::INTERVAL;
    
    -- Update game state
    UPDATE games g
    SET 
      current_player_id = v_next_player.id,
      current_syllable = v_next_syllable,
      timer_end_time = v_new_timer_end,
      timer_duration = v_timer_duration,
      updated_at = NOW()
    WHERE g.id = v_current_game.id;
    
    RETURN json_build_object(
      'success', false,
      'error', v_error_message,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'next_player', v_next_player.name,
      'next_syllable', v_next_syllable
    );
  END IF;

  -- Word is valid - continue with original logic
  WITH alive_players AS (
    SELECT * FROM players p
    WHERE p.room_id = p_room_id AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at
  ),
  indexed_players AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
  ),
  current_index AS (
    SELECT rn FROM indexed_players WHERE id = v_current_game.current_player_id
  )
  SELECT ap.* INTO v_next_player
  FROM alive_players ap, indexed_players ip, current_index ci
  WHERE ip.id = ap.id 
  AND ip.rn = CASE 
    WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
    ELSE ci.rn + 1 
  END;
  
  -- Get random syllable for next round
  SELECT s.syllable INTO v_next_syllable 
  FROM syllables s
  WHERE s.difficulty = (SELECT r.difficulty FROM rooms r WHERE r.id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  IF v_next_syllable IS NULL THEN
    RAISE EXCEPTION 'No syllable found for room difficulty';
  END IF;
  
  -- Calculate new timer duration (10-20 seconds)
  v_timer_duration := 10 + floor(random() * 11)::INT;
  v_new_timer_end := NOW() + (v_timer_duration || ' seconds')::INTERVAL;
  
  -- Update game with next player and syllable
  UPDATE games g
  SET 
    current_player_id = v_next_player.id,
    current_syllable = v_next_syllable,
    used_words = array_append(g.used_words, trim(lower(p_word))),
    correct_words = array_append(COALESCE(g.correct_words, ARRAY[]::TEXT[]), trim(lower(p_word))),
    timer_end_time = v_new_timer_end,
    timer_duration = v_timer_duration,
    round_number = COALESCE(g.round_number, 1) + 1,
    updated_at = NOW()
  WHERE g.id = v_current_game.id;
  
  RETURN json_build_object(
    'success', true,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable,
    'word_accepted', trim(p_word)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Now update handle_timeout function with same fixes
DROP FUNCTION IF EXISTS public.handle_timeout(p_room_id text, p_user_id text);

CREATE OR REPLACE FUNCTION public.handle_timeout(p_room_id text, p_user_id text)
RETURNS json
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_game RECORD;
  v_current_player RECORD;
  v_next_player RECORD;
  v_next_syllable TEXT;
  v_new_lives INT;
  v_timer_duration INT;
  v_new_timer_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current game with row lock
  SELECT * INTO v_current_game 
  FROM games g 
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1
  FOR UPDATE;
  
  IF v_current_game IS NULL THEN
    RAISE EXCEPTION 'No active game found for room %', p_room_id;
  END IF;
  
  -- Get current player with row lock
  SELECT * INTO v_current_player 
  FROM players p 
  WHERE p.room_id = p_room_id AND p.user_id = p_user_id
  FOR UPDATE;
  
  IF v_current_player IS NULL THEN
    RAISE EXCEPTION 'Player not found in room';
  END IF;
  
  -- Decrement player's lives for timeout
  v_new_lives := GREATEST(0, v_current_player.lives - 1);
  
  UPDATE players p
  SET lives = v_new_lives,
      is_alive = (v_new_lives > 0)
  WHERE p.id = v_current_player.id;
  
  -- Check if game should end
  IF v_new_lives = 0 AND (SELECT COUNT(*) FROM players p WHERE p.room_id = p_room_id AND p.is_alive = true AND p.id != v_current_player.id) <= 1 THEN
    -- Game over
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;
    
    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', true,
      'game_ended', true
    );
  END IF;
  
  -- Continue with next alive player using proper rotation logic
  WITH alive_players AS (
    SELECT * FROM players p
    WHERE p.room_id = p_room_id AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at
  ),
  indexed_players AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
  ),
  current_index AS (
    SELECT rn FROM indexed_players WHERE id = v_current_game.current_player_id
  )
  SELECT ap.* INTO v_next_player
  FROM alive_players ap, indexed_players ip, current_index ci
  WHERE ip.id = ap.id 
  AND ip.rn = CASE 
    WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
    ELSE ci.rn + 1 
  END;
  
  -- If current player is dead, start from first alive player
  IF v_new_lives = 0 THEN
    SELECT * INTO v_next_player FROM players p
    WHERE p.room_id = p_room_id AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at 
    LIMIT 1;
  END IF;
  
  -- Get new syllable
  SELECT s.syllable INTO v_next_syllable 
  FROM syllables s
  WHERE s.difficulty = (SELECT r.difficulty FROM rooms r WHERE r.id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  -- Calculate timer
  v_timer_duration := 10 + floor(random() * 11)::INT;
  v_new_timer_end := NOW() + (v_timer_duration || ' seconds')::INTERVAL;
  
  -- Update game
  UPDATE games g
  SET 
    current_player_id = v_next_player.id,
    current_syllable = v_next_syllable,
    timer_end_time = v_new_timer_end,
    timer_duration = v_timer_duration,
    updated_at = NOW()
  WHERE g.id = v_current_game.id;
  
  RETURN json_build_object(
    'success', true,
    'timeout', true,
    'lives_remaining', v_new_lives,
    'player_eliminated', (v_new_lives = 0),
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable
  );
END;
$$;