-- Enable UUID helper
create extension if not exists "uuid-ossp";

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_uid uuid unique references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- 2. tags
create table if not exists public.tags (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 3. memory_cards
create table if not exists public.memory_cards (
  id uuid primary key default uuid_generate_v4(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  media_url text,
  media_type text not null default 'none',
  is_private boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_cards_owner_idx on public.memory_cards(owner);
create index if not exists memory_cards_created_idx on public.memory_cards(created_at desc);

-- 4. memory_card_tags (many-to-many)
create table if not exists public.memory_card_tags (
  memory_card_id uuid not null references public.memory_cards(id) on delete cascade,
  tag_id integer not null references public.tags(id) on delete cascade,
  primary key (memory_card_id, tag_id)
);

-- 5. favorites (optional enhancement)
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_card_id uuid not null references public.memory_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, memory_card_id)
);

-- Row Level Security
alter table public.memory_cards enable row level security;

drop policy if exists "Insert: authenticated only" on public.memory_cards;
create policy "Insert: authenticated only"
  on public.memory_cards
  for insert
  with check (auth.role() = 'authenticated' and auth.uid() = owner);

drop policy if exists "Select: public or owner" on public.memory_cards;
create policy "Select: public or owner"
  on public.memory_cards
  for select
  using (
    auth.role() = 'authenticated'
    and (not is_private or auth.uid() = owner)
  );

drop policy if exists "Update: owner only" on public.memory_cards;
create policy "Update: owner only"
  on public.memory_cards
  for update
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

drop policy if exists "Delete: owner only" on public.memory_cards;
create policy "Delete: owner only"
  on public.memory_cards
  for delete
  using (auth.uid() = owner);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memory_cards_set_updated_at on public.memory_cards;
create trigger memory_cards_set_updated_at
before update on public.memory_cards
for each row
execute function public.set_updated_at();

