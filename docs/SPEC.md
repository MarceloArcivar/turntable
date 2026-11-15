# Turntable for Spotify — Product spec

## Goal

Leave an iPad on a shelf or desk showing a beautiful, slowly spinning record of whatever I'm
listening to on Spotify — and let me pause or skip by touching it.

## Users

- Primary: me (Spotify Premium).
- Up to 4 more people I add to the app's allowlist in the Spotify Developer Dashboard.

## Screens

### 1. Login (first launch, or when logged out) — see `mockups/login.html`
- Record sleeve with the app name "Turntable" and a record peeking out.
- Headline: "Put your music on a record."
- Sub-line: "Play anything in Spotify on your phone or speaker. This iPad shows it spinning."
- Button: **Continue with Spotify** → starts PKCE login (redirects to Spotify's own login page).
- Three trust lines: password never seen by the app; read and playback control only; disconnect anytime.
- If login fails or the user cancels → stay on this screen with a short, friendly error.

### 2. Now playing (main screen) — see `mockups/now-playing.html`

Left: the turntable.
- Plinth (turntable body) with a platter and a vinyl record.
- **Record label = the current album cover**, cropped to a circle, with a spindle dot in the middle.
- Record **spins** while music is playing; stops (keeps its angle, no jump) when paused.
- **Tonearm** rests off the record when paused / nothing playing; swings onto the record (≈700 ms ease) when playing.
- **Tap the record** = play/pause toggle (same as the big button).
- Bottom-left, very subtle: **"spin [5s] ▾"** — a minimal dropdown for seconds per full turn:
  1s, 3s, 5s, 7s, 10s. Default **5s**. Saved in `localStorage` so it survives reloads.
  Changing it should not make the record jump visibly.

Right: info and controls.
- Status line with dot: "NOW PLAYING" / "PAUSED".
- Song title (large), "Artist · Album" (smaller). Long titles: max 2 lines, then ellipsis.
- Progress bar + elapsed / total time. Progress advances smoothly between API polls (local timer).
- Controls: Previous, Play/Pause (large), Next.
- **Up next** card: small cover, next song title, artist (from the queue endpoint). Hide the card if the queue is empty.
- Somewhere unobtrusive (e.g. long-press the status line, or a small menu): **Log out**.

### 3. Idle state (nothing playing)
- Same main screen, arm resting, record not spinning, label shows a neutral placeholder.
- Title area: "Nothing playing" + "Start music in Spotify on any device."
- Controls disabled except Play (which tries to resume on the last active device).

### 4. Portrait
- Same content stacked: turntable on top, info and controls below (see Portrait artboard on the design canvas).

## Themes

Two themes, both in `docs/DESIGN.md`: **Parchment** (default) and **Caramel**.
A small theme switch can live in the same subtle settings area as Log out. Saved in `localStorage`.

## Behaviour details

- **Polling:** `GET /me/player/currently-playing` every 5 s while the page is visible.
  Pause polling when the page is hidden (`visibilitychange`) and resume + fetch immediately when visible.
  Fetch the queue only when the track changes (and after Next/Previous).
- **After a control action** (play/pause/next/prev): update the UI optimistically right away,
  then re-fetch after ~600 ms to confirm.
- **Track change:** crossfade the label image (≈300 ms) so it doesn't flash. Preload the next cover when known.
- **Podcasts:** request with `additional_types=episode`; show the episode/show image and name.
- **Ads:** `currently_playing_type === "ad"` → show "Advertisement", keep the record spinning, hide Up next.
- **Errors:**
  - 401 → refresh the token and retry once; if refresh fails → Login screen.
  - 429 → wait for `Retry-After` seconds before polling again.
  - 404 `NO_ACTIVE_DEVICE` on a control → toast: "Open Spotify on a device first."
  - Network offline → keep the last state, show a tiny "offline" hint, retry automatically.
- **Screen on:** the app itself can't stop the iPad from sleeping reliably; setup guide covers Guided Access /
  Auto-Lock. (Optional later: try the Screen Wake Lock API when available.)

## Out of scope (for v1)

- Playing audio inside the app (Web Playback SDK).
- Search, playlists, library browsing.
- Multiple users switching on the same iPad.
- Native iOS widget.

## Build phases (stop after each one for my test + OK)

1. **Static UI** — rebuild the main screen from the mockup with fake data, both themes, spin dropdown,
   tap-to-pause animation. Test: open locally, compare to mockup.
2. **Spotify login (PKCE)** — login screen, redirect, callback, token storage, refresh, logout.
   Test: log in and out; reload keeps me logged in.
3. **Now playing data** — polling, real title/artist/album cover/progress, idle state.
   Test: play something on my phone; the iPad updates within ~5 s.
4. **Controls + Up next** — play/pause/next/previous, tap record, queue card, error toasts.
   Test: control music on my phone from the iPad.
5. **Deploy + iPad** — GitHub Pages, redirect URI, PWA manifest + icons, Add to Home Screen.
   Test: full flow on the iPad from the home-screen icon.
6. **Polish** — portrait layout, crossfades, offline handling, reduced motion, final review against mockups.

## Acceptance checklist

- [ ] Login never asks for my password on any page other than accounts.spotify.com
- [ ] No client secret anywhere in the repo
- [ ] Record label shows the real album cover and changes with the song
- [ ] Spin speed dropdown works and is remembered
- [ ] Tapping the record pauses/plays the music on my phone
- [ ] Up next shows the right song
- [ ] Works full screen from the iPad home screen, landscape and portrait
- [ ] Nothing playing / ads / no device all handled without errors
