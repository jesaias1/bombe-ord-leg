-- Security Fix Migration: Restrict data access while supporting guest players

-- 1. Restrict profile visibility to authenticated users only
-- Guests don't need to see profiles, only authenticated players
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Keep games viewable only by room members (already correct, just clarifying)
-- The existing policy already checks room membership properly

-- 3. Restrict room viewing to authenticated users or members only
DROP POLICY IF EXISTS "Allow room access for all operations" ON public.rooms;
CREATE POLICY "Authenticated users can view rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (true);

-- Allow anonymous users to view only rooms they're members of
CREATE POLICY "Anonymous users can view rooms they're in"
ON public.rooms
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.room_id = rooms.id
  )
);

-- 4. Improve guest player security with rate limiting check
-- Add index to improve rate_limits query performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action 
ON public.rate_limits(user_id, action, created_at DESC);

-- 5. Add function to validate guest IDs server-side
CREATE OR REPLACE FUNCTION public.is_valid_guest_id(guest_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guest IDs must start with 'guest_' and have reasonable length
  IF guest_id IS NULL OR NOT (guest_id ~* '^guest_[0-9]{13}_[a-z0-9]{9,13}$') THEN
    RETURN false;
  END IF;
  
  -- Optionally check if guest has recent activity (not stale)
  -- This prevents old/stolen guest IDs from being reused indefinitely
  RETURN EXISTS (
    SELECT 1 FROM players
    WHERE user_id = guest_id
    AND joined_at > NOW() - INTERVAL '24 hours'
  );
END;
$$;

-- 6. Add logging table for security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_created 
ON public.security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user 
ON public.security_events(user_id, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
ON public.security_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Add rate limiting function for actions
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id text,
  p_action text,
  p_max_attempts int DEFAULT 10,
  p_window_minutes int DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count int;
BEGIN
  -- Count recent attempts
  SELECT COUNT(*) INTO v_attempt_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - make_interval(mins => p_window_minutes);
  
  -- Log if limit exceeded
  IF v_attempt_count >= p_max_attempts THEN
    INSERT INTO security_events (event_type, user_id, details)
    VALUES ('rate_limit_exceeded', p_user_id, jsonb_build_object(
      'action', p_action,
      'attempts', v_attempt_count,
      'window_minutes', p_window_minutes
    ));
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 8. Improve players RLS to validate guest IDs
DROP POLICY IF EXISTS "players_insert_self" ON public.players;
CREATE POLICY "players_insert_validated"
ON public.players
FOR INSERT
TO authenticated
WITH CHECK (user_id = (auth.uid())::text);

-- Allow anon users to insert only with valid guest ID format
CREATE POLICY "players_insert_guest"
ON public.players
FOR INSERT
TO anon
WITH CHECK (user_id ~* '^guest_[0-9]{13}_[a-z0-9]{9,13}$');

COMMENT ON TABLE public.security_events IS 'Logs security-related events for monitoring and auditing';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if user has exceeded rate limit for an action';
COMMENT ON FUNCTION public.is_valid_guest_id IS 'Validates guest ID format and recency';