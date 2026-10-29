# Original rune tablets

All rune-tablet art was designed for this project from simple paths and pixels.
No physical game cards, published characters, portrait art, traced assets or
reference-card images were consulted. The previous character cards are replaced
by arched stone tablets with chipped corners, a carved edge, side/arch lettering,
an emblem and a shaped wax seal. The back uses an original spiral path.

| Role | Construction |
| --- | --- |
| Werewolf | A crescent bowl between two claw strokes |
| Minion | A triangular hood with one empty glowing eye |
| Mason | Two angular overlapping keystones |
| Seer | A lantern frame holding an eye-shaped flame |
| Robber | A circular key head and broken shaft entering a lock |
| Troublemaker | Opposing curved arrows crossed into a knot |
| Drunk | A tilted flask outline and inner spiral |
| Insomniac | An eye intersecting a candle and its halo |
| Hunter | A diagonal bolt crossing a circular target |
| Tanner | A shield-like leather mask split by a zigzag crack |
| Villager | A small hut outline surrounding a crossed lit window |

The green circle, red jagged seal and purple diamond distinguish village,
werewolf and Tanner teams by shape as well as color. `lib/rules.ts` contains each
small source path; `lib/tablet-atlas.ts` rasterizes all 11 fronts plus the back
into one 288×360 runtime atlas. 3D textures share that atlas; no large bitmap
downloads are required. `lib/theme.mjs` defines the base time-of-day palettes;
`scripts/theme.mjs` generates CSS tokens from them. The card gallery is `/gallery`.

Silkscreen and VT323 remain OFL-licensed fonts; their licenses are in public/fonts.
The original scene prototypes remain in the repository for provenance, but their
portrait-style role sprites are no longer used on cards.
