-- Create the submit_word RPC function that handles word validation and game progression
CREATE OR REPLACE FUNCTION public.submit_word(
  p_room_id TEXT,
  p_user_id UUID,
  p_word TEXT
) RETURNS JSON AS $$
DECLARE
  current_game RECORD;
  current_player RECORD;
  submitting_player RECORD;
  word_exists BOOLEAN := FALSE;
  next_player RECORD;
  next_syllable TEXT;
  alive_players_count INT;
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
  
  -- Get submitting player
  SELECT * INTO submitting_player 
  FROM players p 
  WHERE p.room_id = p_room_id AND p.user_id::TEXT = p_user_id::TEXT;
  
  IF submitting_player IS NULL THEN
    RAISE EXCEPTION 'Player not found in room';
  END IF;
  
  -- Check if it's the player's turn
  IF current_game.current_player_id != submitting_player.id THEN
    RAISE EXCEPTION 'Not your turn';
  END IF;
  
  -- Validate word length
  IF length(trim(p_word)) < 3 THEN
    RAISE EXCEPTION 'Word must be at least 3 characters long';
  END IF;
  
  -- Check if word contains current syllable
  IF position(lower(current_game.current_syllable) IN lower(trim(p_word))) = 0 THEN
    RAISE EXCEPTION 'Word does not contain syllable %', current_game.current_syllable;
  END IF;
  
  -- Check if word was already used
  IF trim(lower(p_word)) = ANY(current_game.used_words) THEN
    RAISE EXCEPTION 'Word already used: %', trim(p_word);
  END IF;
  
  -- Check if word exists in dictionary
  SELECT EXISTS(SELECT 1 FROM danish_words WHERE word = trim(lower(p_word))) INTO word_exists;
  IF NOT word_exists THEN
    RAISE EXCEPTION 'Word not valid: %', trim(p_word);
  END IF;
  
  -- Word is valid, get next player
  SELECT * INTO current_player FROM players WHERE id = current_game.current_player_id;
  
  -- Get next alive player
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
$$ LANGUAGE plpgsql SECURITY DEFINER;