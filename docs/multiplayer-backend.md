# Multiplayer backend

Ordbomben still works well on Supabase Free for small friend-group rooms. Realtime, Auth, Postgres, Edge Functions, and RLS are already part of the stack, so switching to a new Supabase project is the lowest-friction path.

## Move to a new Supabase project

1. Create a new Supabase project.
2. Open the Supabase SQL editor and run `docs/supabase-new-project-bootstrap.sql`.
3. Deploy the functions in `supabase/functions` if you want the full word importer/email functions.
4. Copy `.env.example` to `.env.local`.
5. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the new project's API settings.
6. Import the full word list after the schema is live.

The publishable/anon key is safe to ship in the browser when Row Level Security is correct. Keep the service role key only in Supabase function secrets.

## When to consider an alternative

Stay on Supabase if the game is mostly turn-based and room counts are modest. Consider a realtime-specialized service only if you need very low latency presence at larger scale, server-authoritative timers with many concurrent rooms, or moderation tooling beyond what Postgres/RLS can comfortably handle.

Good future options:

- PartyKit for lightweight room servers.
- Liveblocks for presence-first collaborative rooms.
- A small Node/WebSocket service plus Postgres if you want full control.

For now, a clean Supabase Free setup is the practical move.
