# Free-tier budget — verified October 29, 2026

| Service | Published free allowance |
| --- | --- |
| Supabase database | 500 MB; 5 GB egress |
| Supabase Realtime | 200 peak connections; 2 million messages/month |
| Supabase API / Edge Functions | Unlimited database API requests; 500,000 Edge Function invocations/month |
| Supabase inactivity | Free projects may pause after 7 days of low activity |
| Vercel Hobby | 1 million function invocations/month; 4 active CPU hours; 360 provisioned GB-hours |
| Vercel transfer / builds | 100 GB fast transfer; 10 GB origin transfer; 6,000 build minutes/month; 45 minutes/build |
| Vercel function duration | Fluid Compute: 300s maximum; legacy: 10s default, 60s maximum |

Official sources: [Supabase pricing](https://supabase.com/pricing),
[project pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Vercel limits](https://vercel.com/docs/limits),
[function limits](https://vercel.com/docs/functions/limitations).
Hobby is for personal, non-commercial use. Quotas can change; the provider's
dashboard is authoritative. Database API requests are not Edge Function calls.

## Application targets

- One shared Realtime socket per browser, with public room events and movement.
- No state polling. Subscribe once, re-fetch on a transition or reconnect, and
  use a one-shot authoritative deadline wake-up for timers/narration.
- Movement sends only changes, quantized to 2 decimals, at most 10 Hz. Menus,
  night, hidden tabs, Minimum-quality 3D and battery saver suppress movement traffic.
  Budget a normal evening at 1 movement update/second/player averaged over
  discussion, not continuous running. Broadcast fan-out is counted: a packet
  sent to nine peers costs more than one message.
- A local movement allowance of 10,000 sent packets/player/UTC month caps worst-case
  modeled fan-out at 1 million messages for ten players, leaving headroom for room events.
  Once exhausted, movement continues locally and the UI explains the limit.
- Target fewer than 1,000 game function calls and 3,000 row writes/hour/room.
  No movement writes. A sparse liveness heartbeat is a write-only RPC, not a
  state poll. Deals/actions are committed in one private room JSON document;
  player liveness has one small indexed row/player. Receipts/messages are bounded.
- Supabase pg_cron removes rooms/player rows after 24 hours, avoiding Vercel's
  once-daily Hobby cron restriction. No Supabase Edge Functions are needed.
- Lobby <=150 KiB gzip; complete non-Three.js client chunks <=1 MiB gzip.
  Three.js, tutorial and audio load on demand. The build checks actual gzip sizes.
- 220 render-call ceiling; adaptive shadows/particles/resolution, Minimum-quality fallback,
  calm mode and battery saver. Physical phone performance varies by GPU.

## Load verification

`npm run loadtest` runs ten virtual players through 30 simulated minutes and
prints per-minute function calls, database writes and Realtime deliveries. It
uses the actual engine and shared movement policy; simulated counters are not
provider billing telemetry. Assertions use the limits above and include fan-out,
reconnects and liveness. A continuously moving group can consume the monthly
Realtime quota in a few evenings without the movement cap.

These are budgets for one ten-player group, not a global server-enforced quota.
The local movement allowance is shared across rooms in that browser; resetting
storage or adding devices/groups can exceed it. Check provider usage regularly.
Check actual usage in Supabase and Vercel before inviting more groups. Resume a
paused project in Supabase Dashboard; an application cannot resume it using its
ordinary API key. No artificial keep-alive traffic is added to prevent pausing.
