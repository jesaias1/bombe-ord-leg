-- Update the submit_word function to track correct and incorrect words
CREATE OR REPLACE FUNCTION public.submit_word(p_room_id text, p_user_id text, p_word text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game_id UUID;
  v_current_player_id UUID;
  v_current_syllable TEXT;
  v_used_words TEXT[];
  v_correct_words TEXT[];
  v_incorrect_words TEXT[];
  v_player_id UUID;
  v_next_player_id UUID;
  v_alive_players UUID[];
  v_syllable_count INTEGER;
  v_word_exists BOOLEAN := FALSE;
BEGIN
  -- Input validation
  IF p_word IS NULL OR LENGTH(TRIM(p_word)) = 0 THEN
    RAISE EXCEPTION 'Word cannot be empty';
  END IF;
  
  IF LENGTH(p_word) > 50 THEN
    RAISE EXCEPTION 'Word too long';
  END IF;
  
  -- Get the current game for this room
  SELECT id, current_player_id, current_syllable, used_words, correct_words, incorrect_words, status
  INTO v_game_id, v_current_player_id, v_current_syllable, v_used_words, v_correct_words, v_incorrect_words
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
    -- Add to incorrect words and raise exception
    v_incorrect_words := COALESCE(v_incorrect_words, '{}') || ARRAY[p_word];
    UPDATE games SET incorrect_words = v_incorrect_words WHERE id = v_game_id;
    RAISE EXCEPTION 'Word does not contain the required syllable: %', v_current_syllable;
  END IF;
  
  -- Check if word has already been used
  IF p_word = ANY(v_used_words) THEN
    -- Add to incorrect words and raise exception
    v_incorrect_words := COALESCE(v_incorrect_words, '{}') || ARRAY[p_word];
    UPDATE games SET incorrect_words = v_incorrect_words WHERE id = v_game_id;
    RAISE EXCEPTION 'Word already used: %', p_word;
  END IF;
  
  -- Check if word exists in dictionary
  SELECT COUNT(*) > 0 INTO v_word_exists
  FROM danish_words 
  WHERE LOWER(word) = LOWER(p_word);
  
  IF NOT v_word_exists THEN
    -- Add to incorrect words and raise exception
    v_incorrect_words := COALESCE(v_incorrect_words, '{}') || ARRAY[p_word];
    UPDATE games SET incorrect_words = v_incorrect_words WHERE id = v_game_id;
    RAISE EXCEPTION 'Word not valid: %', p_word;
  END IF;
  
  -- Word is valid, add to used words and correct words
  v_used_words := array_append(v_used_words, p_word);
  v_correct_words := COALESCE(v_correct_words, '{}') || ARRAY[p_word];
  
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
        v_next_player_id := v_alive_players[1];
      ELSE
        v_next_player_id := v_alive_players[i + 1];
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
    correct_words = v_correct_words,
    timer_end_time = NOW() + INTERVAL '15 seconds',
    updated_at = NOW()
  WHERE id = v_game_id;
  
  RETURN TRUE;
END;
$function$;