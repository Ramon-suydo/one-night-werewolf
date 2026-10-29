# HUD audit

Four-player production browser capture at 360, 768 and 1280 pixels. Full inventories are in UX_AUDIT.before.json; screenshots are test-results/audit-PHASE-WIDTH.png. The inventory includes off-screen controls in the scrollable panel.

| Phase | Controls at 360 / 768 / 1280 |
|---|---|
| lobby | 12 / 12 / 12 |
| night | 10 / 10 / 10 |
| dawn | 10 / 10 / 10 |
| day | 15 / 15 / 15 |
| vote | 14 / 14 / 14 |
| result | 13 / 13 / 13 |

## Before: every labeled control

### lobby

Copy invite link; Deal the cards; Manage the fire; Roles in this game; Rules in 30 seconds; Card gallery; Setup presets & play helpers; Emotes & point; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

### night

Lock it in; Manage the fire; Roles in this game; Card gallery; Setup presets & play helpers; Emotes & point; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

### dawn

I’m ready; Manage the fire; Roles in this game; Card gallery; Setup presets & play helpers; Emotes & point; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

### day

Remind me what I learned; +1 min; Call the vote; Manage the fire; Roles in this game; Card gallery; Private notepad · only on this device; Ready to vote; Setup presets & play helpers; Emotes & point; Focus / overview; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

### vote

Audit 1; Audit 2; Audit 3; Confirm; Manage the fire; Roles in this game; Card gallery; Private notepad · only on this device; Setup presets & play helpers; Emotes & point; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

### result

Your night recap · only your own actions; Session scoreboard & highlights; Play again; See every vote; Manage the fire; Roles in this game; Card gallery; Setup presets & play helpers; Emotes & point; Comfort, accessibility & tutorial; Clearing, narrator & room settings; Settings & how to play; Leave room.

## Findings

The centered panel blocks the fire. Role explanations repeat the guidance line. Room settings, role roster, accessibility settings, character controls and management remain below active gameplay. Day and vote have several competing calls to action. The phase headings repeat narrator captions. A right drawer and one context action replace this structure in the HUD stage. World-space avatar/card interaction replaces lists.

## After the HUD replacement

The four-player production browser flow verifies four closed-HUD controls: role chip, menu, reactions and one contextual action. Drawer content is explicit, scrollable and keyboard trapped; no gameplay accordion remains. Night actions, votes and center targets use world-space selections. Portrait framing preserves the horizontal view so every seat remains reachable. Before-state totals were 10–15 controls in game phases. The automatic second round requires no host phase clicks.
