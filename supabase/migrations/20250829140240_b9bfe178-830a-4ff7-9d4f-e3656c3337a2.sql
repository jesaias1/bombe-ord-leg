-- Drop existing functions that use user_id to avoid conflicts
DROP FUNCTION IF EXISTS public.submit_word(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.handle_timeout(uuid, uuid);

-- Canonical RPCs using player_id (UUID) instead of user_id
CREATE OR REPLACE FUNCTION public.submit_word(
  p_room_id uuid,
  p_player_id uuid,
  p_word text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_game RECORD;
  v_submitting_player RECORD;
  v_word_exists BOOLEAN := FALSE;
  v_next_player RECORD;
  v_next_syllable TEXT;
  v_timer_duration INT;
  v_new_timer_end TIMESTAMP WITH TIME ZONE;
  v_word_is_valid BOOLEAN := TRUE;
  v_error_message TEXT := '';
  v_normalized_word TEXT;
BEGIN
  -- Normalize word input
  v_normalized_word := trim(lower(p_word));
  
  -- Get current game with row lock for atomic operations
  SELECT * INTO v_current_game 
  FROM games g 
  WHERE g.room_id::uuid = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1
  FOR UPDATE;
  
  IF v_current_game IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active game found for room'
    );
  END IF;
  
  -- Get submitting player with row lock
  SELECT * INTO v_submitting_player 
  FROM players p 
  WHERE p.id = p_player_id AND p.room_id = p_room_id::text
  FOR UPDATE;
  
  IF v_submitting_player IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Player not found in room'
    );
  END IF;
  
  -- Check if it's the player's turn
  IF v_current_game.current_player_id != v_submitting_player.id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not your turn',
      'lives_remaining', v_submitting_player.lives
    );
  END IF;
  
  -- Validate word and set error flags
  IF length(v_normalized_word) < 3 THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Ordet skal være mindst 3 bogstaver langt';
  ELSIF position(lower(v_current_game.current_syllable) IN v_normalized_word) = 0 THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Ordet skal indeholde stavelsen "' || v_current_game.current_syllable || '"';
  ELSIF v_normalized_word = ANY(COALESCE(v_current_game.used_words, ARRAY[]::text[])) THEN
    v_word_is_valid := FALSE;
    v_error_message := 'Ordet "' || v_normalized_word || '" er allerede brugt';
  ELSE
    -- Check if word exists in dictionary
    SELECT EXISTS(
      SELECT 1 FROM danish_words dw WHERE dw.word = v_normalized_word
    ) INTO v_word_exists;
    
    IF NOT v_word_exists THEN
      v_word_is_valid := FALSE;
      v_error_message := 'Ordet "' || v_normalized_word || '" findes ikke i ordbogen';
    END IF;
  END IF;

  -- If word is invalid, just return error - NO HP decrement, NO turn advance
  IF NOT v_word_is_valid THEN
    -- Optionally add to incorrect_words for tracking (but no other state changes)
    IF v_normalized_word != '' THEN
      UPDATE games g
      SET incorrect_words = CASE 
        WHEN v_normalized_word = ANY(COALESCE(g.incorrect_words, ARRAY[]::text[])) 
        THEN g.incorrect_words
        ELSE array_append(COALESCE(g.incorrect_words, ARRAY[]::text[]), v_normalized_word)
      END
      WHERE g.id = v_current_game.id;
    END IF;
    
    -- Return error response - player keeps their turn and current HP
    RETURN json_build_object(
      'success', false,
      'error', v_error_message,
      'lives_remaining', v_submitting_player.lives
    );
  END IF;

  -- Word is valid - advance turn using proper round-robin logic
  WITH alive_players AS (
    SELECT p.* FROM players p
    WHERE p.room_id = p_room_id::text AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at
  ),
  indexed_players AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
  ),
  current_index AS (
    SELECT rn FROM indexed_players WHERE id = v_current_game.current_player_id
  )
  SELECT ap.* INTO v_next_player
  FROM alive_players ap
  JOIN indexed_players ip ON ip.id = ap.id
  JOIN current_index ci ON true
  WHERE ip.rn = CASE 
    WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
    ELSE ci.rn + 1 
  END;
  
  -- Get random syllable for next round
  SELECT s.syllable INTO v_next_syllable 
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id::text
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM() 
  LIMIT 1;
  
  IF v_next_syllable IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No syllable found for room difficulty'
    );
  END IF;
  
  -- Calculate new timer duration (10-20 seconds)
  v_timer_duration := 10 + floor(random() * 11)::INT;
  v_new_timer_end := NOW() + (v_timer_duration || ' seconds')::INTERVAL;
  
  -- Update game with next player and syllable (avoid duplicates in arrays)
  UPDATE games g
  SET 
    current_player_id = v_next_player.id,
    current_syllable = v_next_syllable,
    used_words = CASE 
      WHEN v_normalized_word = ANY(COALESCE(g.used_words, ARRAY[]::text[])) 
      THEN g.used_words 
      ELSE array_append(COALESCE(g.used_words, ARRAY[]::text[]), v_normalized_word)
    END,
    correct_words = CASE 
      WHEN v_normalized_word = ANY(COALESCE(g.correct_words, ARRAY[]::text[])) 
      THEN g.correct_words 
      ELSE array_append(COALESCE(g.correct_words, ARRAY[]::text[]), v_normalized_word)
    END,
    timer_end_time = v_new_timer_end,
    timer_duration = v_timer_duration,
    round_number = COALESCE(g.round_number, 1) + 1,
    updated_at = NOW()
  WHERE g.id = v_current_game.id;
  
  RETURN json_build_object(
    'success', true,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable,
    'word_accepted', v_normalized_word
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Server error: ' || SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_timeout(
  p_room_id uuid,
  p_player_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_game RECORD;
  v_current_player RECORD;
  v_next_player RECORD;
  v_next_syllable TEXT;
  v_new_lives INT;
  v_timer_duration INT;
  v_new_timer_end TIMESTAMP WITH TIME ZONE;
  v_alive_count INT;
BEGIN
  -- Get current game with row lock
  SELECT * INTO v_current_game 
  FROM games g 
  WHERE g.room_id::uuid = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1
  FOR UPDATE;
  
  IF v_current_game IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active game found for room'
    );
  END IF;
  
  -- Get current player with row lock
  SELECT * INTO v_current_player 
  FROM players p 
  WHERE p.id = p_player_id AND p.room_id = p_room_id::text
  FOR UPDATE;
  
  IF v_current_player IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Player not found in room'
    );
  END IF;

  -- Verify it's actually this player's turn
  IF v_current_game.current_player_id != v_current_player.id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not your turn to timeout'
    );
  END IF;
  
  -- Decrement player's lives for timeout (ONLY place that decrements HP)
  v_new_lives := GREATEST(0, v_current_player.lives - 1);
  
  UPDATE players p
  SET lives = v_new_lives,
      is_alive = (v_new_lives > 0)
  WHERE p.id = v_current_player.id;
  
  -- Count remaining alive players (excluding current if they died)
  SELECT COUNT(*) INTO v_alive_count 
  FROM players p 
  WHERE p.room_id = p_room_id::text 
  AND p.is_alive = true 
  AND (v_new_lives > 0 OR p.id != v_current_player.id);
  
  -- Check if game should end
  IF v_alive_count <= 1 THEN
    -- Game over
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;
    
    RETURN json_build_object(
      'success', false,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true,
      'next_player', null,
      'next_syllable', null
    );
  END IF;
  
  -- Continue with next alive player using proper round-robin rotation
  WITH alive_players AS (
    SELECT p.* FROM players p
    WHERE p.room_id = p_room_id::text AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at
  ),
  indexed_players AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
  ),
  current_index AS (
    SELECT rn FROM indexed_players WHERE id = v_current_game.current_player_id
  )
  SELECT ap.* INTO v_next_player
  FROM alive_players ap
  JOIN indexed_players ip ON ip.id = ap.id
  JOIN current_index ci ON true
  WHERE ip.rn = CASE 
    WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
    ELSE ci.rn + 1 
  END;
  
  -- If current player is dead, start from first alive player
  IF v_new_lives = 0 THEN
    SELECT * INTO v_next_player 
    FROM players p
    WHERE p.room_id = p_room_id::text AND p.is_alive = true 
    ORDER BY p.turn_order, p.joined_at 
    LIMIT 1;
  END IF;
  
  -- Get new syllable
  SELECT s.syllable INTO v_next_syllable 
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id::text
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM() 
  LIMIT 1;
  
  IF v_next_syllable IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No syllable found for room difficulty'
    );
  END IF;
  
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
    RETURN json_build_object(
      'success', false,
      'error', 'Server error: ' || SQLERRM
    );
END;
$function$;

-- Compatibility wrapper for user_id based calls
CREATE OR REPLACE FUNCTION public.submit_word_by_user(
  p_room_id uuid, 
  p_user_id uuid, 
  p_word text
) RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $function$
DECLARE 
  v_player_id uuid;
BEGIN
  SELECT id INTO v_player_id FROM players
  WHERE room_id = p_room_id::text AND user_id = p_user_id::text
  ORDER BY joined_at DESC LIMIT 1;
  
  IF v_player_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found for user in room');
  END IF;
  
  RETURN public.submit_word(p_room_id, v_player_id, p_word);
END; 
$function$;

CREATE OR REPLACE FUNCTION public.handle_timeout_by_user(
  p_room_id uuid, 
  p_user_id uuid
) RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public' 
AS $function$
DECLARE 
  v_player_id uuid;
BEGIN
  SELECT id INTO v_player_id FROM players
  WHERE room_id = p_room_id::text AND user_id = p_user_id::text
  ORDER BY joined_at DESC LIMIT 1;
  
  IF v_player_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found for user in room');
  END IF;
  
  RETURN public.handle_timeout(p_room_id, v_player_id);
END; 
$function$;