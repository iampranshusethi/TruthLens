-- TruthLens: one-time database setup for Google sign-in and cloud history.
-- Run this in your Supabase project's SQL editor (decisions.md D28). Safe to run again.

create table if not exists public.saved_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  type       text        not null check (type in ('review', 'compare')),
  title      text        not null,
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists saved_items_recent on public.saved_items (user_id, created_at desc);

-- Row-level security: every signed-in user can only see and change their own rows.
alter table public.saved_items enable row level security;

drop policy if exists "Read own items" on public.saved_items;
create policy "Read own items" on public.saved_items
  for select using (auth.uid() = user_id);

drop policy if exists "Insert own items" on public.saved_items;
create policy "Insert own items" on public.saved_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Update own items" on public.saved_items;
create policy "Update own items" on public.saved_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Delete own items" on public.saved_items;
create policy "Delete own items" on public.saved_items
  for delete using (auth.uid() = user_id);

-- Usage statistics (decisions.md D38): one anonymous row per review, comparison,
-- chat answer or scanned page. Counts and timings only: no document text, no user
-- id, no IP address.
create table if not exists public.usage_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  type        text        not null check (type in ('review', 'compare', 'chat', 'ocr')),
  kind        text,
  engine      text,
  model       text,
  ok          boolean     not null,
  error_code  text,
  duration_ms integer,
  findings    integer,
  dropped     integer,
  fallbacks   integer,
  cached      boolean     not null default false
);

create index if not exists usage_events_recent on public.usage_events (created_at desc);

-- Row-level security with no policies: browsers can neither read nor write this table.
-- Only the server, using the secret key, records events and reads stats.
alter table public.usage_events enable row level security;

-- Daily generation limits (decisions.md D39): guests get 1 review or comparison a day
-- per device, signed-in users get 3. One row per subject ("user:<id>" or
-- "guest:<random device id>") per day. No document content.
create table if not exists public.daily_generations (
  subject text    not null,
  day     date    not null,
  count   integer not null default 0,
  primary key (subject, day)
);

-- Like usage_events: no policies, so only the server (secret key) can use it.
alter table public.daily_generations enable row level security;

-- Atomically takes one generation if the subject is under the limit.
-- Returns the new count, or null when the limit is already reached.
create or replace function public.take_generation(p_subject text, p_day date, p_limit integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into daily_generations (subject, day, count)
  values (p_subject, p_day, 1)
  on conflict (subject, day) do update
    set count = daily_generations.count + 1
    where daily_generations.count < p_limit
  returning count;
$$;

-- Gives a generation back (used when an analysis fails before producing anything).
create or replace function public.return_generation(p_subject text, p_day date)
returns void
language sql
security definer
set search_path = public
as $$
  update daily_generations set count = greatest(count - 1, 0) where subject = p_subject and day = p_day;
$$;

-- Only the server may call these.
revoke execute on function public.take_generation(text, date, integer) from public, anon, authenticated;
revoke execute on function public.return_generation(text, date) from public, anon, authenticated;
