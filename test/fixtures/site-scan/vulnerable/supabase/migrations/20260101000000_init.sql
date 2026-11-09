-- A table with no row level security at all.
create table public.notes (id uuid primary key, body text);

-- RLS on, but the insert policy lets anyone in.
create table public.posts (id uuid primary key, body text);
alter table public.posts enable row level security;
create policy "anyone can write" on public.posts for insert to anon with check (true);

-- A public bucket.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Runs as its owner with no fixed search_path.
create or replace function public.everything() returns setof public.posts
language sql security definer as $$
  select * from posts;
$$;

-- A view that ignores the RLS of what it reads.
create view public.all_posts as select * from public.posts;
