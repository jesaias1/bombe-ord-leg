-- Fix RPC functions with proper SECURITY DEFINER and type casting
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.set_player_ready(text, uuid, boolean);
DROP FUNCTION IF EXISTS public.can_start_game(text);
DROP FUNCTION IF EXISTS public.reset_players_ready(text);

-- READY FLAGS ON players (if not already present)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_players_room_ready ON public.players (room_id, ready);

-- Toggle ready for the current user's player row
CREATE OR REPLACE FUNCTION public.set_player_ready(
  p_room_id text,
  p_user_id uuid,
  p_ready   boolean
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player_id uuid;
BEGIN
  -- players.user_id is text; cast p_user_id::text to match
  SELECT id
    INTO v_player_id
  FROM players
  WHERE room_id = p_room_id
    AND user_id = p_user_id::text
  ORDER BY joined_at DESC
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not found in room');
  END IF;

  UPDATE players
     SET ready    = p_ready,
         ready_at = CASE WHEN p_ready THEN now() ELSE NULL END
   WHERE id = v_player_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Can the host start? (all non-host players ready & at least 2 players)
CREATE OR REPLACE FUNCTION public.can_start_game(
  p_room_id text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH r AS (
    SELECT creator_id FROM rooms WHERE id = p_room_id
  ),
  p AS (
    SELECT user_id, ready
    FROM players
    WHERE room_id = p_room_id
  )
  SELECT
    CASE
      WHEN (SELECT COUNT(*) FROM p) < 2 THEN false
      ELSE NOT EXISTS (
        SELECT 1
        FROM p
        JOIN r ON true
        -- all players except the host must be ready
        WHERE p.user_id <> r.creator_id
          AND p.ready = false
      )
    END;
$$;

-- Reset ready flags (call this when a new multiplayer game starts)
CREATE OR REPLACE FUNCTION public.reset_players_ready(p_room_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE players
     SET ready = false,
         ready_at = NULL
   WHERE room_id = p_room_id;
$$;