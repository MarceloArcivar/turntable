# CLAUDE.md — Turntable for Spotify (iPad)

This file is the briefing for Claude Code. Read it fully before doing anything in this repo,
then read `docs/SPEC.md` (what to build) and `docs/DESIGN.md` (how it looks).
The approved visual reference is `mockups/now-playing.html` and `mockups/login.html` —
open them in a browser; the real app should look and behave like them.

## What this project is

A web app that turns an iPad into a record player for whatever is playing on the owner's
Spotify account. It shows a spinning vinyl record with the current album cover on the label,
a tonearm, the song title/artist, a progress bar, playback controls and the next song in the queue.

Music keeps playing from the normal Spotify app (phone, speaker, iPad). This app **displays and
controls** it through the Spotify Web API. It does **not** play audio itself.

Personal project, single user (the owner), plus at most 5 allowlisted Spotify accounts
(Spotify Development Mode limit). The owner has Spotify Premium (required for Development Mode).

## How I (the owner) work — important

- I'm a product manager, not a developer. **You write all the code.** I build, test and decide.
- Explain what you changed and **why** at a high level after each step — no line-by-line walkthroughs
  unless I ask.
- Anything I must do by hand (Spotify dashboard, GitHub, iPad settings) → give me numbered,
  step-by-step instructions with the reason for each step.
- Work in small phases (see `docs/SPEC.md` → Build phases). After each phase, tell me exactly
  how to test it, then stop and wait for my OK before the next phase.
- Ask before adding any dependency, framework or build tool.

## Tech stack (decided — don't change without asking)

- **Plain HTML + CSS + JavaScript (ES modules).** No framework, no bundler, no npm runtime deps.
- **Spotify Web API**, called directly from the browser with `fetch`.
- **Auth: Authorization Code flow with PKCE.** Browser-only, no backend.
- **Hosting:** GitHub Pages (free, HTTPS).
- Installed on the iPad via Safari → Share → *Add to Home Screen* (PWA manifest so it opens full screen).
- Local dev: any static server, e.g. `python3 -m http.server 8000`, opened at `http://127.0.0.1:8000`
  (Spotify does not accept `localhost` as a redirect URI; the loopback IP is allowed).

## Security rules (non-negotiable)

1. **Never use or store a client secret.** PKCE exists so we don't need one. The Client ID is public
   and may be committed (it lives in `js/config.js`).
2. **Never commit tokens**, `.env` files, or anything from `localStorage`. Keep `.gitignore` up to date.
3. Request **only these scopes**:
   - `user-read-currently-playing` — what's playing now
   - `user-read-playback-state` — play/pause state, progress, queue
   - `user-modify-playback-state` — play/pause/next/previous from the iPad
   Ask me before adding any other scope.
4. Generate the PKCE `code_verifier` with `crypto.getRandomValues`, hash with `crypto.subtle` (SHA-256),
   and send a random `state` value; reject the callback if `state` doesn't match.
5. Tokens live only in this browser's `localStorage`. Provide a visible **Log out** action that clears them.
6. Remove the `?code=…&state=…` from the URL (`history.replaceState`) right after the token exchange.
7. Never put user data or tokens in console logs in production code.
8. Only load images from Spotify's image CDN (`i.scdn.co`) and fonts from Google Fonts. No other third-party scripts.

## Spotify API notes (checked Nov 2026)

- Spotify changed Development Mode in Feb–Mar 2026 (Premium required, 5 users, some endpoints removed).
  **All player endpoints we need are still available:**
  `GET /v1/me/player/currently-playing`, `GET /v1/me/player`, `GET /v1/me/player/queue`,
  `PUT /v1/me/player/play`, `PUT /v1/me/player/pause`, `POST /v1/me/player/next`, `POST /v1/me/player/previous`.
- Do **not** rely on removed fields like `track.popularity` or `album.label`.
- Album art: `item.album.images` (pick the largest, usually 640×640).
- If a tutorial or older code uses an endpoint, verify it against the current Web API reference first.
- Handle `401` (refresh token, retry once), `429` (wait `Retry-After` seconds), `204` (nothing playing),
  `404 NO_ACTIVE_DEVICE` (show a friendly message).
- Refresh tokens can eventually expire; if a refresh fails, send the user back to the login screen
  without crashing.

## Project structure (target)

```
/
├── index.html              # single page: login view + player view
├── manifest.webmanifest    # PWA: name, icons, display: standalone, landscape
├── css/
│   └── styles.css          # all styles; themes as CSS custom properties
├── js/
│   ├── config.js           # CLIENT_ID, REDIRECT_URI, SCOPES (public values only)
│   ├── auth.js             # PKCE login, callback handling, token refresh, logout
│   ├── spotify.js          # thin API wrapper: getCurrentlyPlaying, getQueue, play, pause, next, previous
│   ├── player-ui.js        # renders the turntable, arm, label image, info, up-next
│   └── app.js              # startup, polling loop, wiring events
├── icons/                  # app icons for home screen
├── mockups/                # approved design references (don't ship; don't edit unless asked)
└── docs/                   # SPEC, DESIGN, SETUP
```

## Coding conventions

- Small, readable functions with a one-line comment on *why* when it isn't obvious.
- No inline `onclick` in HTML; wire events in `app.js`.
- Real `<button>`, `<label>` + `<select>` elements; `aria-label` on icon-only buttons.
- Respect `prefers-reduced-motion` (stop the spin, no arm animation).
- Keep everything working in **Safari on iPadOS** — that's the only target that matters.

## Definition of done for any change

- Works on the iPad (Safari and the home-screen app), landscape and portrait.
- No errors in the console.
- Matches the mockups unless I approved a change.
- You told me what changed, why, and how to test it.
