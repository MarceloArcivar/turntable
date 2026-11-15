# Turntable for Spotify

An iPad web app that shows what you're playing on Spotify as a spinning vinyl record —
album cover on the label, tonearm, title, progress, controls and what's up next.
Tap the record to pause or play.

- Plain HTML/CSS/JS, no framework
- Spotify Web API with Authorization Code + PKCE (no client secret, no backend)
- Hosted on GitHub Pages, installed on the iPad as a home-screen app

## Docs
- `CLAUDE.md` — briefing for Claude Code (stack, rules, security)
- `docs/SPEC.md` — features, behaviour, build phases, acceptance checklist
- `docs/DESIGN.md` — colors, type, sizes, motion
- `docs/SETUP.md` — Spotify dashboard, local testing, GitHub Pages, iPad setup
- `mockups/` — approved design references (open in a browser)

## Run locally
```
python3 -m http.server 8000
```
Then open http://127.0.0.1:8000
