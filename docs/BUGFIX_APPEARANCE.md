# Avatar, night and presentation bugfix audit

Date: 2026-10-30. Runtime under test: the modern `/api/session` client, with local storage standing in for Supabase. Cloud credentials were not used by the tests.

## Diagnosis

The initial source inspection found these concrete causes. The browser reproduction and verification use separate Playwright contexts, rather than tabs sharing a player token.

| Suspected cause | Finding and correction |
| --- | --- |
| Local index or `is me` selects a color | Not found in the active Character renderer. However, every new player was assigned the same default `{cloak:0,hat:0,face:0}`. The server now assigns the first unused stable cloak ID. Ten distinct cloak colors cover a full seated game. |
| Appearance exists only in localStorage | Not the primary cause: appearance was already in the public projection. The editor did save a proposed appearance locally before the server accepted it. It now persists only the confirmed server value in a room. Local preview storage is used only before joining. |
| Late, stale or overwritten updates | Confirmed: there was no cosmetic version or conflict check. A newer broadcast could be overwritten by an older HTTP roster. Changes now require the current appearance version, use the existing atomic room CAS, increment the version, and are limited to one per 500 ms. Both response paths retain newer appearance versions. Legacy numeric appearances are converted on server load, including existing Supabase rooms. |
| Quality tier changes appearance | The old Lambert cloak was affected by lighting and tier-dependent shadows. No palette-quantize or dither post-pass exists in the active renderer. Cloak, hat and skin now use fixed unlit base colors, without fog or tone mapping. The renderer explicitly sets sRGB output and NoToneMapping for every tier. Quality changes resolution, shadows, particles and frame budget, never appearance IDs or palette colors. |
| Local-player tint | No local-player cloak tint was found. A separate confirmed bug changed a disconnected player's cloak to `#252739`, making the same player look different on clients with different connection observations. Connection state now changes posture, never color. The local player has a name badge and a soft ground ring. |

`assets/appearance.ts` is the modern palette and ID source. `appearanceToMaterials` is pure: it receives only appearance IDs and cannot read a quality tier, player identity, seat index, storage, camera or random source. Missing appearance produces neutral gray. All avatars are created from the complete authenticated roster snapshot.

The public player record contains `appearance: {cloakId, hatId, faceId}` and `appearanceVersion`. Updates accept no colors, seeds, geometry or material definitions. Taken colors are disabled in the picker and rejected on the server with a plain message. The host may enable **Allow duplicate colors** in lobby settings. Disabling it requires existing selections to be unique. Rejected edits leave the confirmed appearance selected.

## Night and synchronization fixes

- A real ten-client race was captured: an HTTP `lockVote` response at private revision 82 still described voting, arrived after a Realtime results notification, and reverted one client to voting. Private revision 83 then refreshed only private data, so that client missed the entire result screen. `olderPhase` now rejects phase regressions independently of private revision. Equal-millisecond transitions and earlier night windows are also covered by unit tests.
- Private fetches are tied to their originating round, phase and night window. A delayed private response cannot reopen eyes in a later window. New-round broadcasts clear the previous private role while fetching the new one.
- Results readiness and 3D choreography use server phase timestamps and the synchronized clock offset, including after reconnect.
- Lobby Ready gives immediate local feedback, rolls back on failure, and broadcasts the authoritative server result.
- Sleeping viewers receive a dark closed-eyes overlay. Eyes open only for the active viewer and teammates explicitly named in that viewer's authorized private report. Public animation code never infers a secret role.
- Legal player targets have a red silhouette outline while hovered or selected. Server target and phase validation remains authoritative.
- Card textures initialize on the back cell before their first frame. Instance matrices initialize before paint; the forced 80 ms reveal pause was removed. Face textures remain gated by `permittedFaces` and server authorization.

## Presentation and performance

Spoken announcements, Web Speech calls, recording playback and voice selection were removed from the active client. Public timeline events now show a five-second text popup with a short procedural UI cue. Popups expire even with reduced motion; their animations and button motion respect reduced-motion and Calm settings. Mobile popups sit below the phase strip.

Buttons have hover/press feedback; drawers and role panels ease into place. Avatar turns and stance changes interpolate. Night lighting still blends smoothly. Existing world particles and result effects remain local, with no extra Realtime traffic. Disabling a hold control cancels its pending timer. Escape closes the drawer even if its focused button has become disabled.

The scene projection and authorized card map are memoized so the countdown does not rebuild the world every 250 ms. Character movement reuses vectors, and sky colors are preallocated. Event listeners, animation timers, textures and diagnostic subscriptions have cleanup paths. Reduced motion retains the same 3D world.

## Reproduce and inspect

```sh
npm ci
npx playwright install chromium
npm run check
```

`check` stops on the first failing command. It runs lint, typecheck, all unit/server tests, the load simulation, a production test build and every Playwright test. This local test build enables `NEXT_PUBLIC_AVATAR_DEBUG=1`. Ordinary Vercel `npm run build` leaves diagnostics disabled; do not add this variable in Vercel.

In development or the diagnostic test build, `window.__werewolfAvatars()` returns each rendered avatar's IDs, actual material color hash, expected server palette hash, projected torso position and quality tier. F3 shows these records and a mismatch raises a warning. This exposes only public cosmetics, never roles or night actions.

Browser evidence is attached to the Playwright HTML report under `appearance-<phase>-<tier>`. The appearance test compares four independent clients at Minimum, Low, Medium, High and Ultra in lobby, night, day and result. Two clients also receive an Ultra/Minimum torso screenshot hue comparison (8-degree tolerance). It checks a color update within one second and restoration after refresh. The phase audit writes screenshots for every phase at 360, 768 and 1280 pixels and the control inventory to `docs/UX_AUDIT.after.json`.

The complete browser suite also covers full 3-, 4- and 10-player rounds, private action resolution, automatic redeal, practice, local-only notes, the twelve original rune cards, chat restrictions and escaping, reconnect retries, idle request counts, missing-WebGL recovery, and the ten-avatar draw-call budget. Unit tests retain all previous rule cases and add palette, uniqueness, invalid-ID, version, rate-limit, late-join, eye-state and response-order regressions.

Final verification: `npm run check` completed successfully on 2026-10-30.

| Check | Result |
| --- | --- |
| ESLint | Pass, no errors or warnings |
| TypeScript | Pass |
| Unit/server tests | 318 passed across 26 files |
| Load simulation | Pass (simulation, not cloud telemetry) |
| Production build | Pass |
| Gzip budgets | Lobby 120.5 / 150 KiB; non-Three game 374.9 / 1024 KiB |
| Playwright | 12 passed, including the five-tier/four-phase appearance matrix |
| Diff whitespace check | Pass |

Screenshots were visually reviewed at phone width. Screenshots and software WebGL tests do not constitute a physical-phone frame-rate measurement or a live Supabase deployment test.

## Supabase setup for this client

Appearance is stored in the existing JSON public player rows through `commit_session`; it needs no additional SQL columns. If the project still has only migrations 001-003, run **`supabase/004_director_sessions.sql`** in the Supabase SQL Editor and restart Next.js. The modern health check checks `round_secrets`, not the retired table. Never publish private `round_secrets` or `game_players`; only `game_rooms` is needed by this client. The compatibility API and source reference files remain available for older rooms and review.

## Follow-up: keyboard event crash

The reported `World.useEffect.up` crash occurred because the handler called `toLowerCase()` on `event.key` without checking the runtime value. A synthetic `keyup` event can omit that property even though the TypeScript listener is typed as `KeyboardEvent`. Both key handlers now ignore missing, empty or non-string keys. The keydown handler also checks that its target is an `Element` before calling `closest()`, so events dispatched on `window` or `document` are safe. The browser regression in `tests/e2e/keyboard.spec.ts` dispatches malformed events and verifies that normal keyboard movement continues without a page error.

Follow-up validation passed: lint, typecheck, all 318 unit tests, production build and the targeted keyboard browser regression. The production build and browser regression ran in a temporary, credentials-free copy because Windows had locked the running development server's `.next/trace`. The copy was removed after verification; the development server was not stopped.
