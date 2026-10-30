# One Night Werewolf

Private multiplayer for 3–10 friends. Every player, including the room host, plays on their own device. Talk on Discord or in person; the app never requests a microphone. One React Three Fiber renderer provides the world at five quality tiers. Software renderers start at Minimum. If WebGL is unavailable the game explains how to enable hardware acceleration and offers Retry.

## Run

Node.js 22 recommended.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Different browser profiles/private windows represent separate players. Devices on the same network can use your computer's LAN IP on port 3000. Without credentials, local development uses a persistent single-server store and authenticated public event streams. Vercel requires Supabase.

## Supabase

1. Create a project and enable pg_cron under Database → Extensions.
2. SQL Editor: open `supabase/004_director_sessions.sql`, paste its complete contents into a new query and click Run. This standalone migration creates modern storage, private RPCs, cleanup and the public publication. Existing installations must also run 004; migrations 001-003 alone do not support this client. Preserve older tables for compatibility rooms.
3. Copy .env.example to .env.local. Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable/anon key) and SUPABASE_SERVICE_ROLE_KEY (secret/service-role key). Never put a secret in a NEXT_PUBLIC_ variable.
4. Restart the app. The modern publication contains only `game_rooms`; never publish `round_secrets` or `game_players`. The migration sets this up. `room_public` is used only by the older compatibility API.
5. If the database is paused, resume it in Supabase Dashboard, then Retry in the app. The ordinary API key cannot resume a paused project. Rooms expire after 24 hours. See docs/BUDGET.md for free-plan limits and measured load assumptions.

## Display and effects

Settings includes Minimum, Low, Medium, High and Ultra 3D quality. Calm mode and reduced motion remove bursts and camera motion; battery saver reduces quality and movement traffic. Watch intro runs a skippable camera flight. Phase sweeps, rune rings and result particles are generated locally with no additional database or Realtime traffic. Announcements are animated text popups with short original sound effects; the app does not synthesize or play spoken narration. Appearance uses server-owned palette IDs and versions, with unique cloak colors by default. All art and sound are generated from original code. Reference material is archived under docs/reference and is excluded from the runtime.

## Validation and stage records

npm run check runs lint, TypeScript, unit/server tests, a ten-player load simulation, production build with gzip budgets, and browser tests. Install Chromium first with npx playwright install chromium. For the cross-client render audit, build with `NEXT_PUBLIC_AVATAR_DEBUG=1` (PowerShell: `$env:NEXT_PUBLIC_AVATAR_DEBUG="1"; npm run build`), then run `npm run test:e2e`. Omit that flag for a public deployment. The hook is also enabled in development; F3 opens the per-avatar diagnostic overlay. docs/UX_AUDIT.md records the before-state control inventory and three-width screenshots. The staged rewrite keeps each completed stage in a local Git commit.

See [appearance diagnosis and validation](docs/BUGFIX_APPEARANCE.md) for the fixes and test evidence. No additional Supabase columns are needed for appearance: the versioned public player rows are stored in `game_rooms.state.players` through the existing CAS transaction.

## Deploy

Add these three variables to Vercel Production: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Do not enable LOCAL_DATA_DIR on Vercel. Choose Next.js, Node 22 and npm run build.

```sh
npm install --global vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod
```