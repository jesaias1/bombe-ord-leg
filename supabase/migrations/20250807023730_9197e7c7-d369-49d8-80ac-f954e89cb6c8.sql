-- Create function to get current server time
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;