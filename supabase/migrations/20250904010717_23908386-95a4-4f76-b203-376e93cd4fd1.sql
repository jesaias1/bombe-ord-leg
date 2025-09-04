-- Fix handle_timeout to properly end single-player games when lives reach 0
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
  SELECT * INTO v_current_game
  FROM games g
  WHERE g.room_id = p_room_id AND g.status = 'playing'
  ORDER BY g.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_game IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active game found');
  END IF;

  SELECT * INTO v_current_player
  FROM players p
  WHERE p.id = p_player_id AND p.room_id = p_room_id
  FOR UPDATE;

  IF v_current_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found in room');
  END IF;

  -- must be current player
  IF v_current_game.current_player_id != v_current_player.id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- decrement HP only on timeout
  v_new_lives := GREATEST(0, v_current_player.lives - 1);
  UPDATE players SET lives = v_new_lives, is_alive = (v_new_lives > 0)
  WHERE id = v_current_player.id;

  -- Count total players and alive players AFTER applying this timeout
  SELECT COUNT(*) INTO v_total_players FROM players WHERE room_id = p_room_id;
  SELECT COUNT(*) INTO v_alive_count FROM players WHERE room_id = p_room_id AND is_alive = true;

  -- DEBUG: Log the values
  RAISE NOTICE 'Timeout: player_lives=%, total_players=%, alive_count=%', v_new_lives, v_total_players, v_alive_count;

  -- END CONDITIONS:
  -- Single-player (total = 1): end when this player reaches 0 lives
  -- Multi-player (total > 1): end when 1 or fewer players remain alive
  IF (v_total_players = 1 AND v_new_lives = 0)  -- single player dead
     OR (v_total_players > 1 AND v_alive_count <= 1)  -- multiplayer collapse
  THEN
    UPDATE games g
    SET status = 'finished',
        current_player_id = NULL,
        timer_end_time = NULL,
        current_syllable = NULL,
        updated_at = NOW()
    WHERE g.id = v_current_game.id;

    RAISE NOTICE 'Game ended: single_player=%, lives=%, total=%, alive=%', (v_total_players = 1), v_new_lives, v_total_players, v_alive_count;

    RETURN json_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_new_lives,
      'player_eliminated', (v_new_lives = 0),
      'game_ended', true
    );
  END IF;

  -- Only continue if game didn't end
  -- pick next player round-robin
  WITH alive AS (
    SELECT * FROM players
    WHERE room_id = p_room_id AND is_alive = true
    ORDER BY turn_order, joined_at
  ), idx AS (
    SELECT id, ROW_NUMBER() OVER () rn FROM alive
  ), cur AS (
    SELECT rn FROM idx WHERE id = v_current_game.current_player_id
  )
  SELECT a.* INTO v_next_player
  FROM alive a
  JOIN idx i ON i.id = a.id
  JOIN cur c ON TRUE
  WHERE i.rn = CASE WHEN c.rn = (SELECT COUNT(*) FROM alive) THEN 1 ELSE c.rn + 1 END;

  -- new syllable
  SELECT s.syllable INTO v_next_syllable
  FROM syllables s
  JOIN rooms r ON r.id = p_room_id
  WHERE s.difficulty = r.difficulty
  AND s.word_count >= 5
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_next_syllable IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No syllable found for room');
  END IF;

  v_timer_duration := 10 + floor(random() * 11)::int;
  v_new_timer_end := now() + (v_timer_duration || ' seconds')::interval;

  UPDATE games g
  SET current_player_id = v_next_player.id,
      current_syllable  = v_next_syllable,
      timer_end_time    = v_new_timer_end,
      timer_duration    = v_timer_duration,
      updated_at        = now()
  WHERE g.id = v_current_game.id;

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
    RETURN json_build_object('success', false, 'error', 'Server error: ' || SQLERRM);
END;
$function$;