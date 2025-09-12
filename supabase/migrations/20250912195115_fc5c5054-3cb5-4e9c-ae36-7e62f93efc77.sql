-- Add atomic server clock function for precise client sync
CREATE OR REPLACE FUNCTION public.get_server_epoch_ms()
RETURNS bigint 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT floor(extract(epoch from now()) * 1000)::bigint;
$$;