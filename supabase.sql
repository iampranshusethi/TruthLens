-- TruthLens: one-time database setup for Google sign-in and cloud history.
-- Run this once in your Supabase project's SQL editor (decisions.md D28).

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

create policy "Read own items" on public.saved_items
  for select using (auth.uid() = user_id);

create policy "Insert own items" on public.saved_items
  for insert with check (auth.uid() = user_id);

create policy "Update own items" on public.saved_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Delete own items" on public.saved_items
  for delete using (auth.uid() = user_id);
