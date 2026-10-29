# Optional original sound overrides

Every effect is synthesized live by default. To use your own original recordings, place an MP3 here with a basename from `lib/sound-data.ts`, for example `flip.mp3`, `slam.mp3` or `win.mp3`. The asset manifest requests only files that exist; absent files never cause 404s. Use short, normalized recordings without private speech. All audio passes through the shared buses, master limiter and optional reverb. No audio files from published games are included.
