-- Bootstrap schema for a brand-new Supabase project.
-- The older migration history in this repo contains follow-up patches but not the original base schema.

create extension if not exists pgcrypto;

do $$ begin
  create type public.difficulty_level as enum ('let', 'mellem', 'svaer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.game_status as enum ('waiting', 'playing', 'finished');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null;
end $$;

create table if not exists public.rooms (
  id text primary key,
  name text not null,
  creator_id text,
  difficulty public.difficulty_level not null default 'mellem',
  bonus_letters_enabled boolean not null default true,
  max_players integer not null default 16,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete cascade,
  user_id text,
  name text not null,
  lives integer not null default 3,
  is_alive boolean not null default true,
  ready boolean not null default false,
  ready_at timestamptz,
  turn_order integer,
  joined_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id text references public.rooms(id) on delete cascade,
  status public.game_status not null default 'waiting',
  current_player_id uuid references public.players(id) on delete set null,
  current_syllable text,
  used_words text[] not null default '{}',
  correct_words text[] not null default '{}',
  incorrect_words text[] not null default '{}',
  game_syllables text[],
  syllable_index integer not null default 0,
  round_number integer not null default 1,
  timer_duration integer not null default 15,
  timer_end_time timestamptz,
  turn_seq integer not null default 0,
  winner_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.danish_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  syllables text[],
  frequency_rank integer,
  created_at timestamptz not null default now()
);

create table if not exists public.syllables (
  id uuid primary key default gen_random_uuid(),
  syllable text not null,
  difficulty public.difficulty_level not null default 'mellem',
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (syllable, difficulty)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  total_games_played integer not null default 0,
  total_games_won integer not null default 0,
  total_words_guessed integer not null default 0,
  total_playtime_seconds integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  fastest_word_time integer,
  favorite_syllable text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  event_type text not null,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rooms_creator_id on public.rooms(creator_id);
create index if not exists idx_players_room_id on public.players(room_id);
create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_games_room_id on public.games(room_id);
create index if not exists idx_danish_words_word on public.danish_words(lower(word));
create index if not exists idx_syllables_difficulty on public.syllables(difficulty);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.danish_words enable row level security;
alter table public.syllables enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_stats enable row level security;
alter table public.rate_limits enable row level security;
alter table public.security_events enable row level security;

drop policy if exists "Public read rooms" on public.rooms;
create policy "Public read rooms" on public.rooms for select using (true);
drop policy if exists "Public create rooms" on public.rooms;
create policy "Public create rooms" on public.rooms for insert with check (true);
drop policy if exists "Room creators update rooms" on public.rooms;
create policy "Room creators update rooms" on public.rooms for update using (true) with check (true);

drop policy if exists "Public read players" on public.players;
create policy "Public read players" on public.players for select using (true);
drop policy if exists "Public create players" on public.players;
create policy "Public create players" on public.players for insert with check (true);
drop policy if exists "Public update players" on public.players;
create policy "Public update players" on public.players for update using (true) with check (true);

drop policy if exists "Public read games" on public.games;
create policy "Public read games" on public.games for select using (true);
drop policy if exists "Public create games" on public.games;
create policy "Public create games" on public.games for insert with check (true);
drop policy if exists "Public update games" on public.games;
create policy "Public update games" on public.games for update using (true) with check (true);

drop policy if exists "Public read dictionary" on public.danish_words;
create policy "Public read dictionary" on public.danish_words for select using (true);
drop policy if exists "Public read syllables" on public.syllables;
create policy "Public read syllables" on public.syllables for select using (true);

create or replace function public.get_room_safe(p_room_locator text)
returns setof public.rooms
language sql
security definer
set search_path = public
as $$
  select *
  from public.rooms
  where id = upper(trim(p_room_locator))
     or id = trim(p_room_locator)
  limit 1;
$$;

create or replace function public.get_players_public(p_room_id text, p_guest_id text default null)
returns table (
  id uuid,
  room_id text,
  user_id text,
  name text,
  lives integer,
  is_alive boolean,
  turn_order integer,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.room_id, p.user_id, p.name, p.lives, p.is_alive, p.turn_order, p.joined_at
  from public.players p
  where p.room_id = p_room_id
  order by p.joined_at;
$$;

create or replace function public.join_room_with_lives(p_room_id text, p_user_id text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select id into v_player_id
  from public.players
  where room_id = p_room_id and user_id = p_user_id
  limit 1;

  if v_player_id is null then
    insert into public.players (room_id, user_id, name, lives, is_alive, turn_order)
    values (
      p_room_id,
      p_user_id,
      coalesce(nullif(trim(p_name), ''), 'Gæst'),
      3,
      true,
      (select count(*) + 1 from public.players where room_id = p_room_id)
    )
    returning id into v_player_id;
  else
    update public.players
    set name = coalesce(nullif(trim(p_name), ''), name)
    where id = v_player_id;
  end if;

  return v_player_id;
end;
$$;

create or replace function public.is_room_creator(p_room_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where id = p_room_id
      and creator_id = coalesce(auth.uid()::text, creator_id)
  );
$$;

create or replace function public.start_game_reset_lives(p_room_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.players
  set lives = 3, is_alive = true
  where room_id = p_room_id;
$$;

create or replace function public.pick_syllable(p_difficulty public.difficulty_level)
returns text
language sql
security definer
set search_path = public
as $$
  select syllable
  from public.syllables
  where difficulty = p_difficulty
  order by random()
  limit 1;
$$;

create or replace function public.start_new_game(p_room_id text, p_user_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_player uuid;
  v_syllable text;
  v_difficulty public.difficulty_level;
  v_game_id uuid;
begin
  update public.players
  set lives = 3, is_alive = true
  where room_id = p_room_id;

  select difficulty into v_difficulty from public.rooms where id = p_room_id;
  select id into v_first_player
  from public.players
  where room_id = p_room_id and is_alive = true
  order by joined_at
  limit 1;

  if v_first_player is null then
    return jsonb_build_object('success', false, 'error', 'Ingen spillere i rummet');
  end if;

  v_syllable := coalesce(public.pick_syllable(v_difficulty), 'or');

  insert into public.games (
    room_id, status, current_player_id, current_syllable,
    used_words, correct_words, incorrect_words,
    timer_duration, timer_end_time, turn_seq
  )
  values (
    p_room_id, 'playing', v_first_player, v_syllable,
    '{}', '{}', '{}',
    15, now() + interval '15 seconds', 1
  )
  returning id into v_game_id;

  return jsonb_build_object('success', true, 'game_id', v_game_id);
end;
$$;

create or replace function public.submit_word(p_room_id text, p_player_id uuid, p_word text, p_turn_seq integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_word text := lower(trim(p_word));
  v_alive_players uuid[];
  v_next_player uuid;
  v_next_name text;
  v_next_syllable text;
  v_difficulty public.difficulty_level;
begin
  select * into v_game
  from public.games
  where room_id = p_room_id and status = 'playing'
  order by created_at desc
  limit 1
  for update;

  if v_game.id is null then
    return jsonb_build_object('success', false, 'error', 'Intet aktivt spil');
  end if;

  if v_game.turn_seq <> p_turn_seq then
    return jsonb_build_object('success', false, 'ignored', true);
  end if;

  if v_game.current_player_id <> p_player_id then
    return jsonb_build_object('success', false, 'error', 'Ikke din tur');
  end if;

  if v_word = any(v_game.used_words) then
    return jsonb_build_object('success', false, 'error', 'Ordet er allerede brugt');
  end if;

  if v_game.current_syllable is not null and position(lower(v_game.current_syllable) in v_word) = 0 then
    return jsonb_build_object('success', false, 'error', 'Ordet mangler stavelsen');
  end if;

  if not exists (select 1 from public.danish_words where lower(word) = v_word) then
    return jsonb_build_object('success', false, 'error', 'Ordet findes ikke i ordbogen');
  end if;

  select array_agg(id order by joined_at) into v_alive_players
  from public.players
  where room_id = p_room_id and is_alive = true;

  select id into v_next_player
  from (
    select id, row_number() over (order by joined_at) as rn
    from public.players
    where room_id = p_room_id and is_alive = true
  ) ordered
  where rn = coalesce((
    select rn + 1
    from (
      select id, row_number() over (order by joined_at) as rn
      from public.players
      where room_id = p_room_id and is_alive = true
    ) current_pos
    where id = p_player_id
  ), 1)
  limit 1;

  if v_next_player is null then
    v_next_player := v_alive_players[1];
  end if;

  select difficulty into v_difficulty from public.rooms where id = p_room_id;
  v_next_syllable := coalesce(public.pick_syllable(v_difficulty), v_game.current_syllable, 'or');

  update public.games
  set current_player_id = v_next_player,
      current_syllable = v_next_syllable,
      used_words = array_append(v_game.used_words, v_word),
      correct_words = array_append(v_game.correct_words, v_word),
      timer_end_time = now() + make_interval(secs => v_game.timer_duration),
      turn_seq = v_game.turn_seq + 1,
      updated_at = now()
  where id = v_game.id;

  select name into v_next_name from public.players where id = v_next_player;

  return jsonb_build_object(
    'success', true,
    'word_accepted', v_word,
    'next_player', v_next_name,
    'current_player_id', v_next_player,
    'current_player_name', v_next_name,
    'current_syllable', v_next_syllable,
    'timer_end_time', (now() + make_interval(secs => v_game.timer_duration)),
    'timer_duration', v_game.timer_duration,
    'turn_seq', v_game.turn_seq + 1
  );
end;
$$;

create or replace function public.handle_timeout(p_room_id text, p_player_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_lives integer;
  v_alive_count integer;
  v_next_player uuid;
  v_next_name text;
  v_next_syllable text;
  v_difficulty public.difficulty_level;
begin
  select * into v_game
  from public.games
  where room_id = p_room_id and status = 'playing'
  order by created_at desc
  limit 1
  for update;

  if v_game.current_player_id <> p_player_id then
    return jsonb_build_object('success', false, 'error', 'Ikke aktuel spiller');
  end if;

  update public.players
  set lives = greatest(lives - 1, 0),
      is_alive = lives - 1 > 0
  where id = p_player_id
  returning lives into v_lives;

  select count(*) into v_alive_count
  from public.players
  where room_id = p_room_id and is_alive = true;

  if v_alive_count <= 1 then
    select id into v_next_player
    from public.players
    where room_id = p_room_id and is_alive = true
    order by joined_at
    limit 1;

    update public.games
    set status = 'finished', winner_player_id = v_next_player, updated_at = now()
    where id = v_game.id;

    return jsonb_build_object(
      'success', true,
      'timeout', true,
      'lives_remaining', v_lives,
      'player_eliminated', v_lives <= 0,
      'game_ended', true
    );
  end if;

  select id into v_next_player
  from public.players
  where room_id = p_room_id and is_alive = true and id <> p_player_id
  order by joined_at
  limit 1;

  select difficulty into v_difficulty from public.rooms where id = p_room_id;
  v_next_syllable := coalesce(public.pick_syllable(v_difficulty), v_game.current_syllable, 'or');

  update public.games
  set current_player_id = v_next_player,
      current_syllable = v_next_syllable,
      timer_end_time = now() + make_interval(secs => v_game.timer_duration),
      turn_seq = v_game.turn_seq + 1,
      updated_at = now()
  where id = v_game.id;

  select name into v_next_name from public.players where id = v_next_player;

  return jsonb_build_object(
    'success', true,
    'timeout', true,
    'lives_remaining', v_lives,
    'player_eliminated', v_lives <= 0,
    'game_ended', false,
    'current_player_id', v_next_player,
    'current_player_name', v_next_name,
    'current_syllable', v_next_syllable,
    'timer_end_time', (now() + make_interval(secs => v_game.timer_duration)),
    'timer_duration', v_game.timer_duration,
    'turn_seq', v_game.turn_seq + 1
  );
end;
$$;

create or replace function public.get_server_time()
returns timestamptz
language sql
stable
as $$ select now(); $$;

create or replace function public.get_server_epoch_ms()
returns bigint
language sql
stable
as $$ select floor(extract(epoch from now()) * 1000)::bigint; $$;

insert into public.syllables (syllable, difficulty, word_count) values
  ('an', 'let', 1000), ('er', 'let', 1000), ('or', 'let', 1000), ('de', 'let', 1000),
  ('ing', 'mellem', 800), ('for', 'mellem', 800), ('lig', 'mellem', 800), ('ter', 'mellem', 800),
  ('sk', 'svaer', 500), ('tr', 'svaer', 500), ('kr', 'svaer', 500), ('st', 'svaer', 500)
on conflict (syllable, difficulty) do nothing;

insert into public.danish_words (word, frequency_rank) values
  ('and', 1), ('anderledes', 2), ('ord', 3), ('orden', 4), ('bord', 5), ('morgen', 6),
  ('stjerne', 7), ('forstå', 8), ('skole', 9), ('træning', 10), ('kroner', 11),
  ('lighed', 12), ('spiller', 13), ('danmark', 14), ('dansk', 15), ('computer', 16),
  ('bombe', 17), ('venner', 18), ('familie', 19), ('arbejde', 20)
on conflict (word) do nothing;
