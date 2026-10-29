-- Apply after 001_game.sql. The authoritative state remains in the existing
-- atomic JSONB room document, so settings/timeline/chat commit with game state.
alter table public.private_rooms
  add column if not exists settings jsonb generated always as (state -> 'settings') stored,
  add column if not exists narration_step integer generated always as ((state #>> '{narration,narration_step}')::integer) stored,
  add column if not exists step_started_at bigint generated always as ((state #>> '{narration,step_started_at}')::bigint) stored;
update public.private_rooms set state = jsonb_set(state, '{settings}',
  '{"narrator":false,"narrationSpeed":1,"textChat":"off","profanityFilter":true,"discord":""}'::jsonb)
where not (state ? 'settings');
-- Never publish private_rooms. Appearance, timeline, sanitized chat and emotes
-- are projected into room_public by the server. Public position broadcasts
-- contain only {type,player,round,x,z,at}; they never contain the room document.
revoke all on public.private_rooms from anon, authenticated;
grant all on public.private_rooms to service_role;
comment on column public.private_rooms.step_started_at is 'Authoritative narrator step start, Unix milliseconds; pause/resume preserves elapsed time.';
