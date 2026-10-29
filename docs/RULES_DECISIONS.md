# Rules decisions

The requested rules are implemented as the contract, pending the owner's physical-rulebook verification. This is an original digital implementation, with no published card images consulted.

| Decision | Implementation |
|---|---|
| Classic teams | Final effective cards determine teams; Tanner is independent. |
| New default | Solo roles. Effective original Tanner, Drunk, Troublemaker and Robber each have an independent goal. Other players follow final-card teams. |
| Doppelgänger copy marker | Travels with the physical card. `rules/decisions.ts` is the one-line switch. |
| Doppel-Insomniac display | An unmoved Doppelgänger card displays Doppelgänger, without its copied marker; final evaluation still uses its effective copy. |
| Missing Doppel choice | Its unassigned card counts as Villager for team evaluation. No information or action is invented. |
| Immediate Doppel actions | Copied Seer/Robber/Troublemaker/Drunk act in the first step. Copied wolf/Minion/Mason/Insomniac wake in their later windows. |
| Optional actions | Lone-wolf peek, Robber swap and Troublemaker swap may be declined. Timeouts may omit any action. |
| Hunter chains | Resolve to a fixed point; each target is added once. Skip fires no shot. |
| Skip votes | Count for nobody. With Skip enabled, one-vote ties banish tied seats unless every player has exactly one vote. |
| Tanner and no-wolf edge cases | Apply the requested Classic branches; a banished Tanner prevents a werewolf-team win, but may share a village win. |
| Beginner at ten players | Impossible with the requested inventory: excluding Doppelgänger, Minion and Masons leaves 12 cards, while ten players require 13. Beginner is therefore limited to nine; Classic remains available at ten. No extra Villager is silently invented. |
| Doppel enable switch | Off by default, independent of Classic/Solo. |

Uncertain rulings to verify: copied-marker travel; the Doppel-Insomniac display; missing-copy treatment; Skip with a one-vote tie; and the Beginner ten-player inventory conflict. Solo goals are house rules supplied by the owner. Public role lists reveal only the deck multiset, never owners. Center positions are Left, Middle and Right.
