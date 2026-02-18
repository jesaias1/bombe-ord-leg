-- Grant INSERT permissions to anon/public role on games table
-- This is needed for guest users to create games
GRANT INSERT ON public.games TO anon;
GRANT INSERT ON public.games TO authenticated;