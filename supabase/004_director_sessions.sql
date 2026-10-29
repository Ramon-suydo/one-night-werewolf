-- Standalone modern room storage. Prior migrations may remain for old rooms.
create schema if not exists extensions;
create extension if not exists pg_cron;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.round_secrets(code text primary key check(code ~ '^[A-HJ-NP-Z]{4}$'),state jsonb not null,revision bigint not null default 0,updated_at timestamptz not null default now());
create table if not exists public.game_rooms(code text primary key references public.round_secrets(code) on delete cascade,state jsonb not null);
create table if not exists public.game_players(code text not null references public.round_secrets(code) on delete cascade,player_id uuid not null,token_hash text not null,last_seen bigint not null,primary key(code,player_id));
alter table public.round_secrets enable row level security;
alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
revoke all on public.round_secrets,public.game_players from public,anon,authenticated;
revoke all on public.game_rooms from public,anon,authenticated;
grant select on public.game_rooms to anon,authenticated;
grant all on public.round_secrets,public.game_rooms,public.game_players to service_role;
drop policy if exists public_game_room_read on public.game_rooms;
create policy public_game_room_read on public.game_rooms for select to anon,authenticated using(true);
create or replace function public.commit_session(p_code text,p_expected bigint,p_private jsonb,p_public jsonb) returns boolean language plpgsql security invoker set search_path=public as $$
declare affected integer;
begin
 if p_expected=-1 then insert into round_secrets(code,state,revision) values(p_code,p_private,0) on conflict do nothing;
 else update round_secrets set state=p_private,revision=p_expected+1,updated_at=now() where code=p_code and revision=p_expected;end if;
 get diagnostics affected=row_count;if affected=0 then return false;end if;
 insert into game_players(code,player_id,token_hash,last_seen) select p_code,(p->>'id')::uuid,p->>'tokenHash',(p->>'seen')::bigint from jsonb_array_elements(p_private->'players') p on conflict(code,player_id) do update set last_seen=greatest(game_players.last_seen,excluded.last_seen) where game_players.last_seen<excluded.last_seen-25000;
 -- A private action must never cause a public update, even a revision-only one.
 insert into game_rooms(code,state) values(p_code,p_public) on conflict(code) do update set state=excluded.state where game_rooms.state is distinct from excluded.state;
 return true;
end $$;
revoke all on function public.commit_session(text,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_session(text,bigint,jsonb,jsonb) to service_role;
create or replace function public.touch_session(p_code text,p_token text) returns void language plpgsql security definer set search_path=public,extensions as $$
declare stamp bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 if p_token !~ '^[a-f0-9]{64}$' or p_code !~ '^[A-HJ-NP-Z]{4}$' then return;end if;
 update game_players set last_seen=stamp where code=p_code and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and last_seen<stamp-12500 and exists(select 1 from round_secrets where code=p_code and updated_at>now()-interval '24 hours');
 if found then update round_secrets set updated_at=now(),state=jsonb_set(state,'{updated}',to_jsonb(stamp)) where code=p_code and updated_at<now()-interval '5 minutes';end if;
end $$;
revoke all on function public.touch_session(text,text) from public;
grant execute on function public.touch_session(text,text) to anon,authenticated;
do $$begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_rooms')then alter publication supabase_realtime add table public.game_rooms;end if;end$$;
-- Supabase pg_cron enforces 24-hour retention.
do $$begin if exists(select 1 from pg_extension where extname='pg_cron') and not exists(select 1 from cron.job where jobname='expire-director-sessions')then perform cron.schedule('expire-director-sessions','17 * * * *',$job$delete from public.round_secrets where updated_at<now()-interval '24 hours'$job$);end if;end$$;
