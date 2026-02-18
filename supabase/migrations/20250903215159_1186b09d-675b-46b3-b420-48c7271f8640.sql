-- Add turn_seq column to games table for idempotent turn management
ALTER TABLE public.games 
ADD COLUMN turn_seq integer DEFAULT 0;