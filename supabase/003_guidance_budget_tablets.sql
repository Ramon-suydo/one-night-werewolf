-- Run after 001 and 002. Private room JSON still commits atomically.
create table if not exists public.room_players (
  code text not null references public.private_rooms(code) on delete cascade,
  player_id uuid not null, token_hash text not null,
  last_seen bigint not null, primary key(code, player_id)
);
alter table public.room_players enable row level security;
revoke all on public.room_players from anon, authenticated;
grant all on public.room_players to service_role;
insert into public.room_players(code,player_id,token_hash,last_seen)
 select r.code,(p->>'id')::uuid,p->>'tokenHash',(p->>'seen')::bigint
 from public.private_rooms r cross join lateral jsonb_array_elements(r.state->'players') p
 on conflict do nothing;
create or replace function public.commit_room(p_code text,p_expected bigint,p_state jsonb,p_public jsonb)
returns boolean language plpgsql security invoker set search_path=public as $$
declare affected integer;
begin
 if p_expected=-1 then insert into private_rooms(code,state,revision) values(p_code,p_state,0) on conflict do nothing;
 else update private_rooms set state=p_state,revision=p_expected+1,updated_at=now() where code=p_code and revision=p_expected; end if;
 get diagnostics affected=row_count; if affected=0 then return false; end if;
 insert into room_players(code,player_id,token_hash,last_seen)
 select p_code,(p->>'id')::uuid,p->>'tokenHash',(p->>'seen')::bigint from jsonb_array_elements(p_state->'players') p
 on conflict(code,player_id) do update set last_seen=greatest(room_players.last_seen,excluded.last_seen)
 where room_players.last_seen < excluded.last_seen - 15000;
 insert into room_public(code,state) values(p_code,p_public) on conflict(code) do update set state=excluded.state
 where (room_public.state-'revision') is distinct from (excluded.state-'revision');
 return true;
end $$;
revoke all on function public.commit_room(text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_room(text,bigint,jsonb,jsonb) to service_role;
create extension if not exists pgcrypto with schema extensions;
-- Write-only sparse heartbeat: no game data is returned or exposed.
create or replace function public.touch_player(p_code text,p_token text) returns void
language plpgsql security definer set search_path=public,extensions as $$
declare stamp bigint := (extract(epoch from clock_timestamp())*1000)::bigint;
begin
 if p_code !~ '^[A-HJ-NP-Z]{4}$' or p_token !~ '^[a-f0-9]{64}$' then return; end if;
 update room_players set last_seen=stamp where code=p_code
   and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and last_seen < stamp-25000
   and exists(select 1 from private_rooms where code=p_code and updated_at>now()-interval '24 hours');
 if found then update private_rooms set updated_at=now(),state=jsonb_set(state,'{updated}',to_jsonb(stamp)) where code=p_code and updated_at<now()-interval '5 minutes'; end if;
end $$;
revoke all on function public.touch_player(text,text) from public;
grant execute on function public.touch_player(text,text) to anon,authenticated;
-- Existing hourly pg_cron cleanup cascades to room_players. No tick writes,
-- no extra chronological indexes, no publication of either private table.
