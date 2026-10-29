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
2. SQL Editor → New query: run supabase/001_game.sql, then 002_clearing_narration_chat.sql, then 003_guidance_budget_tablets.sql. Existing installations run only unapplied migrations.
3. Copy .env.example to .env.local. Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable/anon key) and SUPABASE_SERVICE_ROLE_KEY (secret/service-role key). Never put a secret in a NEXT_PUBLIC_ variable.
4. Restart the app. Only room_public belongs in the supabase_realtime publication; private tables must never be published.
5. If the database is paused, resume it in Supabase Dashboard, then Retry in the app. The ordinary API key cannot resume a paused project. Rooms expire after 24 hours. See docs/BUDGET.md for free-plan limits and measured load assumptions.

## Display and effects

Settings includes Minimum, Low, Medium, High and Ultra 3D quality. Calm mode and reduced motion remove bursts and camera motion; battery saver reduces quality and movement traffic. Watch intro runs a skippable camera flight. Phase sweeps, rune rings and result particles are generated locally with no additional database or Realtime traffic. All art and sound are generated from original code. Reference material is archived under docs/reference and is excluded from the runtime.

## Validation and stage records

npm run check runs lint, TypeScript, unit/server tests, a ten-player load simulation, production build with gzip budgets, and browser tests. Install Chromium first with npx playwright install chromium. docs/UX_AUDIT.md records the before-state control inventory and three-width screenshots. The staged rewrite keeps each completed stage in a local Git commit.

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