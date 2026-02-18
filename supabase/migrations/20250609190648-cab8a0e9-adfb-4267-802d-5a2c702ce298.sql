
-- Create the submit_word function that handles word validation and game logic
CREATE OR REPLACE FUNCTION public.submit_word(
  p_room_id TEXT,
  p_user_id TEXT,
  p_word TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_id UUID;
  v_current_player_id UUID;
  v_current_syllable TEXT;
  v_used_words TEXT[];
  v_player_id UUID;
  v_next_player_id UUID;
  v_alive_players UUID[];
  v_syllable_count INTEGER;
BEGIN
  -- Get the current game for this room
  SELECT id, current_player_id, current_syllable, used_words, status
  INTO v_game_id, v_current_player_id, v_current_syllable, v_used_words
  FROM games 
  WHERE room_id = p_room_id AND status = 'playing';
  
  IF v_game_id IS NULL THEN
    RAISE EXCEPTION 'No active game found for this room';
  END IF;
  
  -- Get the player ID for this user
  SELECT id INTO v_player_id 
  FROM players 
  WHERE room_id = p_room_id AND user_id = p_user_id AND is_alive = true;
  
  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found or not alive';
  END IF;
  
  -- Check if it's the player's turn
  IF v_current_player_id != v_player_id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Check if word contains the current syllable
  IF NOT (LOWER(p_word) LIKE '%' || LOWER(v_current_syllable) || '%') THEN
    RAISE EXCEPTION 'Word does not contain the required syllable: %', v_current_syllable;
  END IF;
  
  -- Check if word has already been used
  IF p_word = ANY(v_used_words) THEN
    RAISE EXCEPTION 'Word already used: %', p_word;
  END IF;
  
  -- Check if word exists in dictionary (basic validation)
  SELECT COUNT(*) INTO v_syllable_count
  FROM danish_words 
  WHERE LOWER(word) = LOWER(p_word);
  
  IF v_syllable_count = 0 THEN
    RAISE EXCEPTION 'Word not valid: %', p_word;
  END IF;
  
  -- Add word to used words
  v_used_words := array_append(v_used_words, p_word);
  
  -- Get next alive player
  SELECT ARRAY(
    SELECT id 
    FROM players 
    WHERE room_id = p_room_id AND is_alive = true 
    ORDER BY joined_at
  ) INTO v_alive_players;
  
  -- Find next player in rotation
  FOR i IN 1..array_length(v_alive_players, 1) LOOP
    IF v_alive_players[i] = v_current_player_id THEN
      IF i = array_length(v_alive_players, 1) THEN
        v_next_player_id := v_alive_players[1]; -- Wrap around to first player
      ELSE
        v_next_player_id := v_alive_players[i + 1]; -- Next player
      END IF;
      EXIT;
    END IF;
  END LOOP;
  
  -- Generate new syllable from syllables table
  SELECT syllable INTO v_current_syllable
  FROM syllables 
  WHERE difficulty = (SELECT difficulty FROM rooms WHERE id = p_room_id)
  ORDER BY RANDOM() 
  LIMIT 1;
  
  -- Update the game with new state
  UPDATE games 
  SET 
    current_player_id = v_next_player_id,
    current_syllable = v_current_syllable,
    used_words = v_used_words,
    timer_end_time = NOW() + INTERVAL '15 seconds',
    updated_at = NOW()
  WHERE id = v_game_id;
  
  RETURN TRUE;
END;
$$;
