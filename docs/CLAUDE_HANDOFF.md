# Werewolf: compact handoff for Claude

## Goal and constraints

Finish and polish this existing multiplayer game through focused fixes, not another rewrite. Prioritize broken interactions, animation/state desynchronization, mobile usability, reconnects and enjoyable feedback. Keep usage low. Current direction: original pixel-style **3D only**, 3-10 players, no microphone/WebRTC and no spoken/AI announcements. Preserve game rules, server privacy, reduced motion and existing art. Music and procedural sound effects remain.

At handoff creation the working tree contained intentional modified and untracked fixes; the GitHub upload checkpoints that work. **Inspect `git status` and preserve any newer local changes. Do not reset, clean or overwrite them.** Do not read/share `.env.local`, credentials, private room data or full chat history. Start with this file; read other files only for the issue being investigated.

## Architecture: where to look

Next.js 15 App Router, React 19, TypeScript, Tailwind, React Three Fiber/Three.js; Supabase Postgres + Realtime, with a persistent local store for development/tests.

| Area | Main files |
| --- | --- |
| Deterministic rules | `engine/`, `rules/`; Classic/Solo, 12 roles including Doppelganger |
| Server validation/director/storage | `lib/session-service.ts`, `session-director.ts`, `session-store.ts`, `session-schema.ts` |
| Privacy/network | `lib/session-projection.ts`, `session-order.ts`; `app/use-session.ts`; `/api/session`, `/api/advance`, `/api/me/private` |
| HUD and controls | `app/page.tsx`, `session-drawer.tsx`, `hold-button.tsx`, `hud.css` |
| World/cards/appearance | `app/clearing.tsx`, `components/Card3D.tsx`, `lib/scene.ts`, `card-interaction.ts`, `assets/appearance.ts` |
| Presentation | `app/announcements.tsx`, `cinematic.tsx`, `world-vfx.tsx`; `lib/audio.ts`, `audio-manager.ts` |

All deals, actions, swaps and winning decisions run on the server. Realtime exposes public state only. Own role/report comes through authenticated private responses; full reveal is public only in Results. Automatic phases: lobby -> dealing -> fixed night windows -> dawn -> day -> vote -> result -> next round. Host controls the lobby, not gameplay phases. Anonymous tokens persist in localStorage. Preserve idempotency and target/phase checks.

Supabase needs `supabase/004_director_sessions.sql`; 001-003 alone are insufficient for this client. Publish only modern `game_rooms`, never private `round_secrets` or `game_players`. Older `/api/game` remains for compatibility; the active UI uses the modern endpoints. Setup is in README.

## Changes already implemented, and why

- **Appearance:** players previously shared a default cloak; disconnected avatars changed color; updates lacked versions. Stable `cloakId/hatId/faceId` now come from one palette, with pure `appearanceToMaterials`, first-unused cloak assignment, unique colors by default, optional duplicates, version/conflict validation and 500 ms rate limiting. Editor persists confirmed server values. Legacy numeric cosmetics migrate on server load.
- **Consistent rendering:** all tiers explicitly use sRGB/NoToneMapping. Cloak, hat and skin have fixed unlit colors; connection state changes posture, not color. Local identity uses a badge/ring. Debug builds expose `window.__werewolfAvatars()` and F3 cosmetic hashes; ordinary production builds disable it.
- **Network race:** a late vote HTTP response could overwrite an already-received Results broadcast, causing a player to miss Results. `olderPhase` guards phase/round/night-window ordering; newer appearance versions are retained. Private fetches are scoped to their originating phase/window. New rounds clear old private cards.
- **Night/reveals:** sleeping viewers get darkening; only authorized teammates open eyes. Legal player targets get red outlines. Authorized faces come from `permittedFaces`. Cards initialize their back texture/matrix before painting; forced reveal delay was removed. Private awake/selection data feeds the scene directly, avoiding stale mutable-bus render values. Result choreography follows server timestamps.
- **Polish:** voices were replaced with expiring text popups and short UI cues. Buttons/panels ease; turns/stances interpolate; existing particles, camera rails and quiet generated audio remain. Countdown updates no longer rebuild the scene unnecessarily; vectors/colors are reused. Escape works after disabled-button focus loss; disabled holds cancel their timers.
- **Latest runtime fix:** `World` keyup assumed `event.key` existed. Both key handlers now ignore invalid/missing keys, and keydown checks `target instanceof Element` before `closest()`. `tests/e2e/keyboard.spec.ts` dispatches malformed events and confirms movement still works.

## Verified versus unfinished

Last full `npm run check`: lint/typecheck/build/load simulation passed; **318 unit tests and 12 browser tests passed**, including full 3/4/10-player rounds, five-tier/four-phase appearance agreement, Ultra/Minimum torso hue comparison, reconnect, privacy, chat and three-width UI captures. After the keyboard fix: lint/typecheck/318 unit tests, isolated production build and the new keyboard browser test passed. The keyboard regression was subsequently included in the broader suite; current tabletop verification supersedes this baseline.

**Latest tabletop upgrade:** replay is now connected and reconstructs exchanges in 3D, including filtered seeking without changing card history. Night target chips, explicit passes, dealt/dawn memory panels, a final-reveal pause, private swap feedback, direct day conversation, and a QR/share invite sheet are implemented. Public-only sequence numbers and private-response generation/time checks prevent stale UI regressions. Current verification: lint, types, build and 337 unit/server tests pass. The full browser run passed 17 scenarios and exposed one replay layering bug; after fixing it, all five tabletop scenarios passed, covering the final outstanding scenario. Start with `docs/TABLETOP_POLISH.md` for the current design and verification notes; the older baseline results above describe the earlier checkpoint.

Live Supabase deployment, real-phone GPU performance and current Lighthouse scores were not verified. Existing Lighthouse reports predate these changes. Load counts are simulation, not cloud telemetry. Check real night targeting/hold/undo and all visible buttons visually; API-driven smoke actions alone cannot prove animation quality. Detailed evidence: `docs/BUGFIX_APPEARANCE.md`.

## Efficient workflow

1. Inspect the relevant files and reproduce one concrete issue. Use narrow searches; skip `node_modules`, `.next`, `.local-data`, reports and `docs/reference` archives.
2. Make a small fix and run the relevant regression. Do not weaken tests or replace rules to make them pass. Briefly report cause, change and evidence.
3. Repeat for actual problems, then run `npm run check` once as the final gate. It enables cosmetic diagnostics for its test build. Do not set `NEXT_PUBLIC_AVATAR_DEBUG` on Vercel.
4. Windows: simultaneous dev/build can lock `.next/trace`. Do not stop the user's server or delete its output without coordination; use `npm run check:isolated` for a same-drive, credentials-free validation copy. Remove temporary source copies afterward so TypeScript/ESLint do not scan them. Tests must use local storage, not real cloud rooms.

Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e -- tests/e2e/keyboard.spec.ts`, `npm run check`. Install Chromium with `npx playwright install chromium` if needed. In this Windows environment npm is available at `C:\nvm4w\nodejs\npm.cmd`.
