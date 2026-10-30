# Project entry point

Read `docs/CLAUDE_HANDOFF.md` first. It summarizes the architecture, completed fixes, verification results and unfinished work.

Improve this existing game with focused, reproduced fixes. Preserve server-only game logic, private role boundaries, original 3D art, reduced-motion support, and the existing rules. Announcements are text; do not restore synthesized voices or microphone features.

Read only the files needed for the current issue. Run targeted regressions while working, then `npm run check` as the final gate. Do not weaken tests to make them pass.

Never commit credentials, `.env.local`, local room data, generated builds or reports. Supabase/Vercel setup is in `README.md`; only `.env.example` belongs in Git.
