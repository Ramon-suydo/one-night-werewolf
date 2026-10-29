-- Run once in the Supabase SQL Editor. No client can read private_rooms.
create table public.private_rooms (
  code text primary key check (code ~ '^[A-HJ-NP-Z]{4}$'),
  state jsonb not null,
  revision bigint not null,
  updated_at timestamptz not null default now()
);
create table public.room_public (
  code text primary key references public.private_rooms(code) on delete cascade,
  state jsonb not null
);
alter table public.private_rooms enable row level security;
alter table public.room_public enable row level security;
revoke all on public.private_rooms from anon, authenticated;
revoke all on public.room_public from anon, authenticated;
grant all on public.private_rooms, public.room_public to service_role;
grant select on public.room_public to anon, authenticated;
create policy "Public progress only" on public.room_public for select to anon, authenticated using (true);

create or replace function public.commit_room(p_code text, p_expected bigint, p_state jsonb, p_public jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  if p_expected = -1 then
    insert into private_rooms(code, state, revision) values (p_code, p_state, 0) on conflict do nothing;
  else
    update private_rooms set state = p_state, revision = p_expected + 1, updated_at = now()
      where code = p_code and revision = p_expected;
  end if;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;
  insert into room_public(code, state) values (p_code, p_public)
    on conflict (code) do update set state = excluded.state
    where (room_public.state - 'revision') is distinct from (excluded.state - 'revision');
  return true;
end $$;
revoke all on function public.commit_room(text, bigint, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_room(text, bigint, jsonb, jsonb) to service_role;
alter publication supabase_realtime add table public.room_public;

-- pg_cron is available in Supabase. Enable it in Database > Extensions first.
create extension if not exists pg_cron;
select cron.schedule('expire-werewolf-rooms', '17 * * * *',
  $$delete from public.private_rooms where updated_at < now() - interval '24 hours'$$);
