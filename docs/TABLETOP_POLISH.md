# Tabletop experience upgrade

The design follows the social structure described by [the publisher](https://beziergames.com/collections/all-games/products/one-night-ultimate-werewolf): a small group plays one night and one day, everyone participates, and nobody has to sit out as a moderator. The browser replaces hidden physical handling with server-authorized private views. This is an original implementation with original art; published card artwork is not used.

## Translating the table into a browser

| Physical experience | Digital implementation |
| --- | --- |
| Memorize your dealt card | A private flip and readable role panel. After the final reveal, a two-second shared pause lets that player see their card before night starts. The 25-second cap remains. |
| Close your eyes | A dark private view, hidden table labels, closed avatar eyes and server-side authorization. Removing the overlay cannot reveal unauthorized card faces. |
| Wake for your original role | Fixed shared windows; only the authorized player receives actionable card targets and private reports. Appearance colors identify people, not roles. |
| Touch a card or exchange two | Raycast cards plus accessible target chips. A single target is insufficient for Troublemaker or a two-center Seer action. Optional passes require an explicit choice. Accepted swaps animate privately with sealed cards. |
| Remember what happened on your turn | Dawn shows your own report and authorized cards. Day labels your role as **Dealt**, rather than implying it is your current card. A later exchange can invalidate an earlier observation. |
| Discuss and bluff | New rooms enable day-only text chat, directly accessible from the table. Hosts can choose Off or Lobby/Day/Results. Night remains silent. Reactions and chat share one panel; private notes remain local. Failed sends retain the draft. |
| Point simultaneously | Each vote remains private until resolution. Selecting is separate from holding to lock, and a failed save cannot accidentally lock a different ballot. |
| Turn over the cards and explain the outcome | Existing final-card resolution is retained. A complete replay reconstructs card exchanges, peeks, copies, votes and Hunter shots, with original-card comparison and actor filters. Filtering does not change physical card history. |

The owner's agreed rule variants are preserved, including personal goals, optional Skip, one-vote tie handling and the Doppelganger copy marker. They are not presented as newly verified official rulings. See `RULES_DECISIONS.md` for the contract; select Classic teams for the final-card team experience. No win-condition rewrite was needed for this upgrade.

## What changed

- `night-dock.tsx`, `private-memory.tsx`, and `lib/tabletop.ts` provide explicit, private role interactions and memory cues. They use the existing server contract, not a second client-side engine.
- `interactiveCards` prevents inert roles, pack wolves and already-revealed cards from advertising illegal interactions. Drunk never receives the center card's face. Successful private swap feedback contains only seat IDs, with no new role information or network broadcasts.
- Seat mats and aligned center positions make the 3D space read as a shared table. Batched avatar eyes save one draw call per player. Quality settings now change actual resolution; replay uses a lightweight, readable inspection view.
- Replay is wired to the results action and previous-round review. It uses an isolated overhead scene, visible labels, ghost handling and swap paths. Seeking rebuilds from the original deal; filters only affect highlighted events. Calm mode retains a static 3D reconstruction and text equivalent. An automatic next round keeps running and clearly offers a return to the player's seat.
- Welcome is immediately usable. The camera tour is optional. The invite sheet offers QR, native sharing when available, and a selectable link when clipboard access is blocked.
- Public updates have a sequence that advances only when public information changes. Private actions, receipts and private revision counters cannot increment it. Delayed same-phase responses cannot revert ready states or remove newly joined players.
- Private replies are checked against room, generation, phase, window, revision and timestamp. Interrupted replies retry with backoff. Removing a seat clears its local session; a delayed reply cannot resurrect it. Returning after a long outage starts the next deal now instead of simulating missed rounds.

## Validation workflow

`npm run check` runs lint, types, all unit/server tests, the existing load simulation, a production build with gzip budgets, and Playwright. The load simulation is not live Supabase telemetry; it does not certify the modern director's production quota consumption.

On Windows, `npm run check:isolated` runs the same checks in a credentials-free copy on the same drive. This avoids a running dev server locking `.next/trace` and avoids Webpack's cross-drive dependency resolution problem. Only an explicit source allowlist is copied. Artifacts are collected under `test-results/isolated`; the dependency junction is unlinked before the temporary copy is removed. Generated local data is excluded from TypeScript and ESLint.

The new browser scenarios use real private action controls, including target cardinality, Undo and a deliberately interrupted private reply. They also cover private dawn memory, an animated replay across the next automatic deal, stale ready responses, blocked clipboard access, optional intro, day conversation, and removal while an appearance reply is pending. Existing 3-, 4- and 10-player, privacy, appearance-tier, card-art, idle-network and keyboard regressions remain.

Real-phone frame rate and live Supabase deployment remain separate checks. No production database or credentials are used by automated tests.

## Verification record (2026-10-30)

- Lint and TypeScript passed. All 337 unit/server tests in 30 files passed.
- Production build passed its gzip budgets: lobby 124.6 / 150 KiB; non-Three.js game 386.6 / 1024 KiB. The diagnostic verification build is not a live-phone performance measurement.
- The complete browser run passed 17 scenarios and found a replay seat label intercepting the next-round return button. Replay controls now render above projected labels; the existing end-to-end scenario checks this interaction without a forced click. All five tabletop scenarios passed in the final rerun (2.1 minutes), including the previously failing next-round return. Across the full run and focused rerun, all 18 browser scenarios are validated.
- Mobile captures cover lobby, dealing, night, dawn, day, vote and results at 360, 768 and 1280 px. Replay was visually inspected at 390 px; cards and seat labels fit without clipping.
- The load simulation passed; it models compatibility-engine traffic and does not certify live Supabase quotas. No database migration or new deployment variable is required for this upgrade beyond the existing 004 director migration.

## Individual lobby ready rings

The host can select 3-10 players directly in the lobby or in Lobby setup. Selecting 6 creates exactly six separate assigned rings around the fire, including empty seats. Each seated player owns one ring; spectators and departed players have none. Gold indicates ready, teal indicates your unready ring, and empty seats are muted. The Ready button and tapping your ring both place your avatar into your own ring; walking into/out of it updates your readiness. Other players see confirmed readiness.

A fixed player count is enforced on the server: extra participants can spectate, early Start is rejected, and the unanimous ten-second countdown waits for the configured number. Changing the count clears readiness and cancels the countdown. A count cannot be reduced below seated players. If a required seat leaves between rounds, the director returns to the lobby. Flexible (3-10) preserves the previous variable-size start behavior and renders one ring per current seat, with at least three visible. Existing rooms remain compatible. No SQL migration is required.

Ready-ring verification: lint, typecheck, 341 unit/server tests in 31 files, and the production build passed (125.0 KiB lobby gzip; 388.1 KiB non-Three.js game). The full 19-scenario browser run passed 18 and encountered one ECONNRESET in the direct test API client. That client now retries only supported transport failures with the same idempotency key. A five-scenario rerun passed the 3- and 10-player rounds, three-width audit, keyboard and six-player ring flow. After the final lobby-only camera/name-label adjustment, build and unit gates passed again and both keyboard and six-player ring scenarios passed. The ring scenario exercises host count changes, all six clients, button entry/exit, walking out/in, readiness replication and automatic deal. The final 390 px screenshot was visually inspected; labels are separate and within the viewport.

## Welcome and saved-room entry

Opening `/` always shows the welcome menu, even when localStorage remembers a room. Resume room is an explicit action and preserves the same anonymous token and seat. Reloading `/?room=CODE` still reconnects automatically when CODE matches the remembered room; a different invitation opens the join form. The welcome menu also links directly to the skippable introduction. Returning home does not send a Leave command or erase the saved seat.

The entry regression also exposed an older `:focus-within` rule that repositioned the panel on mouse-down, so mouse-up could miss the intended button. The panel now keeps its position and uses viewport-limited scrolling for short screens. The entry test exercises the real introduction and resume buttons, checks the same anonymous seat after resume/reload, and creates another room from the home menu.

Entry-fix verification: lint, TypeScript, all 341 unit/server tests, production build and all six selected browser regressions (entry plus tabletop) passed. Build budgets: lobby 125.1 / 150 KiB gzip; non-Three.js game 388.2 / 1024 KiB. The initial failing intro click was fixed by removing the layout shift; no forced clicks or relaxed assertions were added.
