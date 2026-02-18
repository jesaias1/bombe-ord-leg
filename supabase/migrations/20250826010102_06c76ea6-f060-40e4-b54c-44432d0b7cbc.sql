-- Remove the security definer view which is flagged by linter
DROP VIEW IF EXISTS public.rooms_safe_view;

-- The get_room_safe function already handles security properly with SECURITY DEFINER
-- and contains the same logic as the view, so no view is needed