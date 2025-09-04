-- Update submit_word to track incorrect words and improve syllable selection
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
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

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

  RETURN json_build_object(
    'success', true,
    'word_accepted', v_word,
    'next_player', v_next_player.name,
    'next_syllable', v_next_syllable
  );
END;
$function$