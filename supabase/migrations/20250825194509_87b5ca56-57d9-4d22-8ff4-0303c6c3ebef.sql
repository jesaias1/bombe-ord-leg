-- Fix Issue 1: Remove duplicate submit_word function to resolve PostgREST conflict
-- Drop the duplicate submit_word function with uuid parameter
DROP FUNCTION IF EXISTS public.submit_word(p_room_id text, p_user_id uuid, p_word text);

-- Keep only the text-based version and enhance it to handle HP decrements (Issue 2)
-- Drop and recreate the main submit_word function with proper HP logic
DROP FUNCTION IF EXISTS public.submit_word(p_room_id text, p_user_id text, p_word text);

CREATE OR REPLACE FUNCTION public.submit_word(p_room_id text, p_user_id text, p_word text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_game RECORD;
  current_player RECORD;
  submitting_player RECORD;
  word_exists BOOLEAN := FALSE;
  next_player RECORD;
  next_syllable TEXT;
  timer_duration INT;
  new_timer_end TIMESTAMP WITH TIME ZONE;
  word_is_valid BOOLEAN := TRUE;
  error_message TEXT := '';
  new_lives INT;
BEGIN
  -- Get current game
  SELECT * INTO current_game 
  FROM games g 
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1;
  
  IF current_game IS NULL THEN
    RAISE EXCEPTION 'No active game found for room %', p_room_id;
  END IF;
  
  -- Get submitting player
  SELECT * INTO submitting_player 
  FROM players p 
  WHERE p.room_id = p_room_id AND p.user_id = p_user_id;
  
  IF submitting_player IS NULL THEN
    RAISE EXCEPTION 'Player not found in room';
  END IF;
  
  -- Check if it's the player's turn
  IF current_game.current_player_id != submitting_player.id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Validate word and set error flags instead of raising exceptions immediately
  IF length(trim(p_word)) < 3 THEN
    word_is_valid := FALSE;
    error_message := 'Word must be at least 3 characters long';
  ELSIF position(lower(current_game.current_syllable) IN lower(trim(p_word))) = 0 THEN
    word_is_valid := FALSE;
    error_message := 'Word does not contain syllable ' || current_game.current_syllable;
  ELSIF trim(lower(p_word)) = ANY(current_game.used_words) THEN
    word_is_valid := FALSE;
    error_message := 'Word already used: ' || trim(p_word);
  ELSE
    -- Check if word exists in dictionary
    SELECT EXISTS(SELECT 1 FROM danish_words WHERE word = trim(lower(p_word))) INTO word_exists;
    IF NOT word_exists THEN
      word_is_valid := FALSE;
      error_message := 'Word not valid: ' || trim(p_word);
    END IF;
  END IF;

  -- If word is invalid, decrement HP and handle consequences
  IF NOT word_is_valid THEN
    -- Decrement player's lives
    new_lives := GREATEST(0, submitting_player.lives - 1);
    
    UPDATE players 
    SET lives = new_lives,
        is_alive = (new_lives > 0)
    WHERE id = submitting_player.id;
    
    -- Add word to incorrect_words if it was provided
    IF trim(p_word) != '' THEN
      UPDATE games 
      SET incorrect_words = array_append(COALESCE(incorrect_words, ARRAY[]::text[]), trim(lower(p_word)))
      WHERE id = current_game.id;
    END IF;
    
    -- Check if player is now dead or if game should end
    IF new_lives = 0 THEN
      -- Player is dead, check remaining alive players
      IF (SELECT COUNT(*) FROM players WHERE room_id = p_room_id AND is_alive = true AND id != submitting_player.id) <= 1 THEN
        -- Game over - only 1 or fewer players remain
        UPDATE games 
        SET status = 'finished',
            current_player_id = NULL,
            timer_end_time = NULL,
            current_syllable = NULL,
            updated_at = NOW()
        WHERE id = current_game.id;
        
        RETURN json_build_object(
          'success', false,
          'error', error_message,
          'lives_remaining', new_lives,
          'player_eliminated', true,
          'game_ended', true
        );
      END IF;
    END IF;
    
    -- Continue game with next alive player
    WITH alive_players AS (
      SELECT * FROM players 
      WHERE room_id = p_room_id AND is_alive = true 
      ORDER BY turn_order, joined_at
    ),
    indexed_players AS (
      SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
    ),
    current_index AS (
      SELECT rn FROM indexed_players WHERE id = current_game.current_player_id
    )
    SELECT ap.* INTO next_player
    FROM alive_players ap, indexed_players ip, current_index ci
    WHERE ip.id = ap.id 
    AND ip.rn = CASE 
      WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
      ELSE ci.rn + 1 
    END;
    
    -- If current player is dead, start from first alive player
    IF new_lives = 0 THEN
      SELECT * INTO next_player FROM players 
      WHERE room_id = p_room_id AND is_alive = true 
      ORDER BY turn_order, joined_at 
      LIMIT 1;
    END IF;
    
    -- Get new syllable
    SELECT syllable INTO next_syllable 
    FROM syllables 
    WHERE difficulty = (SELECT difficulty FROM rooms WHERE id = p_room_id)
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Calculate timer (10-20 seconds)
    timer_duration := 10 + floor(random() * 11)::INT;
    new_timer_end := NOW() + (timer_duration || ' seconds')::INTERVAL;
    
    -- Update game state
    UPDATE games 
    SET 
      current_player_id = next_player.id,
      current_syllable = next_syllable,
      timer_end_time = new_timer_end,
      timer_duration = timer_duration,
      updated_at = NOW()
    WHERE id = current_game.id;
    
    RETURN json_build_object(
      'success', false,
      'error', error_message,
      'lives_remaining', new_lives,
      'player_eliminated', (new_lives = 0),
      'next_player', next_player.name,
      'next_syllable', next_syllable
    );
  END IF;

  -- Word is valid - continue with original logic
  WITH alive_players AS (
    SELECT * FROM players 
    WHERE room_id = p_room_id AND is_alive = true 
    ORDER BY turn_order, joined_at
  ),
  indexed_players AS (
    SELECT *, ROW_NUMBER() OVER () as rn FROM alive_players
  ),
  current_index AS (
    SELECT rn FROM indexed_players WHERE id = current_game.current_player_id
  )
  SELECT ap.* INTO next_player
  FROM alive_players ap, indexed_players ip, current_index ci
  WHERE ip.id = ap.id 
  AND ip.rn = CASE 
    WHEN ci.rn = (SELECT COUNT(*) FROM alive_players) THEN 1 
    ELSE ci.rn + 1 
  END;
  
  -- Get random syllable for next round
  SELECT syllable INTO next_syllable 
  FROM syllables 
  WHERE difficulty = (SELECT difficulty FROM rooms WHERE id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  IF next_syllable IS NULL THEN
    RAISE EXCEPTION 'No syllable found for room difficulty';
  END IF;
  
  -- Calculate new timer duration (10-20 seconds)
  timer_duration := 10 + floor(random() * 11)::INT;
  new_timer_end := NOW() + (timer_duration || ' seconds')::INTERVAL;
  
  -- Update game with next player and syllable
  UPDATE games 
  SET 
    current_player_id = next_player.id,
    current_syllable = next_syllable,
    used_words = array_append(used_words, trim(lower(p_word))),
    correct_words = array_append(COALESCE(correct_words, ARRAY[]::TEXT[]), trim(lower(p_word))),
    timer_end_time = new_timer_end,
    timer_duration = timer_duration,
    round_number = COALESCE(round_number, 1) + 1,
    updated_at = NOW()
  WHERE id = current_game.id;
  
  RETURN json_build_object(
    'success', true,
    'next_player', next_player.name,
    'next_syllable', next_syllable,
    'word_accepted', trim(p_word)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Also create a function to handle timeouts with HP decrements
CREATE OR REPLACE FUNCTION public.handle_timeout(p_room_id text, p_user_id text)
RETURNS json
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_game RECORD;
  current_player RECORD;
  next_player RECORD;
  next_syllable TEXT;
  new_lives INT;
  timer_duration INT;
  new_timer_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current game
  SELECT * INTO current_game 
  FROM games g 
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC 
  LIMIT 1;
  
  IF current_game IS NULL THEN
    RAISE EXCEPTION 'No active game found for room %', p_room_id;
  END IF;
  
  -- Get current player
  SELECT * INTO current_player 
  FROM players p 
  WHERE p.room_id = p_room_id AND p.user_id = p_user_id;
  
  IF current_player IS NULL THEN
    RAISE EXCEPTION 'Player not found in room';
  END IF;
  
  -- Decrement player's lives for timeout
  new_lives := GREATEST(0, current_player.lives - 1);
  
  UPDATE players 
  SET lives = new_lives,
      is_alive = (new_lives > 0)
  WHERE id = current_player.id;
  
  -- Check if game should end
  IF new_lives = 0 AND (SELECT COUNT(*) FROM players WHERE room_id = p_room_id AND is_alive = true AND id != current_player.id) <= 1 THEN
    -- Game over
    UPDATE games 
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = NOW()
    WHERE id = current_game.id;
    
    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', new_lives,
      'player_eliminated', true,
      'game_ended', true
    );
  END IF;
  
  -- Continue with next player
  WITH alive_players AS (
    SELECT * FROM players 
    WHERE room_id = p_room_id AND is_alive = true 
    ORDER BY turn_order, joined_at
  )
  SELECT * INTO next_player FROM alive_players LIMIT 1;
  
  -- Get new syllable
  SELECT syllable INTO next_syllable 
  FROM syllables 
  WHERE difficulty = (SELECT difficulty FROM rooms WHERE id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  -- Calculate timer
  timer_duration := 10 + floor(random() * 11)::INT;
  new_timer_end := NOW() + (timer_duration || ' seconds')::INTERVAL;
  
  -- Update game
  UPDATE games 
  SET 
    current_player_id = next_player.id,
    current_syllable = next_syllable,
    timer_end_time = new_timer_end,
    timer_duration = timer_duration,
    updated_at = NOW()
  WHERE id = current_game.id;
  
  RETURN json_build_object(
    'success', true,
    'timeout', true,
    'lives_remaining', new_lives,
    'player_eliminated', (new_lives = 0),
    'next_player', next_player.name,
    'next_syllable', next_syllable
  );
END;
$$;