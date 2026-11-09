create table public.notes (id uuid primary key, owner uuid not null, body text);
alter table public.notes enable row level security;
create policy "owners read" on public.notes for select to authenticated using (owner = auth.uid());
create policy "owners write" on public.notes for insert to authenticated with check (owner = auth.uid());

insert into storage.buckets (id, name, public) values ('photos', 'photos', false);

create or replace function public.is_owner(note uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.notes where id = note and owner = auth.uid());
$$;
revoke execute on function public.is_owner(uuid) from public, anon;

create view public.my_notes with (security_invoker = true) as select * from public.notes;
