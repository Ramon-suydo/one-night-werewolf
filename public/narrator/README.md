# Optional narrator recordings

Add your own licensed MP3s here before building/deploying. Missing files use
Web Speech. Exact basenames: night, werewolves, minion, masons, seer, robber,
troublemaker, drunk, insomniac, dawn, day, minute, vote, result (all .mp3).

Record the captions in lib/narration.ts. For the last four use:

- Five minutes on the clock. Talk it out.
- One minute left.
- Time is up. Cast your votes.
- The village has spoken.

Keep files shorter than their normal-speed windows. Playback follows room
speed and seeks to elapsed time after reconnects. Files are public assets and
must contain no player-specific or hidden information. No recordings are
bundled; the existing generative music and nature cues are synthesized live.
