-- Add wrapper functions that accept room codes and resolve to UUIDs
-- These prevent crashes if client accidentally passes a code instead of UUID

CREATE OR REPLACE FUNCTION public.submit_word_by_code(p_room_code text, p_user_id uuid, p_word text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE 
  v_room_id uuid;
BEGIN
  -- Resolve room code to UUID
  SELECT r.id INTO v_room_id FROM rooms r WHERE r.id = p_room_code LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Room not found');
  END IF;
  
  -- Forward to the UUID version
  RETURN public.submit_word(v_room_id, p_user_id, p_word);
END; $$;

CREATE OR REPLACE FUNCTION public.handle_timeout_by_code(p_room_code text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE 
  v_room_id uuid;
BEGIN
  -- Resolve room code to UUID
  SELECT r.id INTO v_room_id FROM rooms r WHERE r.id = p_room_code LIMIT 1;
  
  IF v_room_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Room not found');
  END IF;
  
  -- Forward to the UUID version
  RETURN public.handle_timeout(v_room_id, p_user_id);
END; $$;