# Design reference

Approved mockups: `mockups/now-playing.html` (interactive) and `mockups/login.html`.
Target device: iPad, landscape 1194×834 CSS px as the reference frame; must also work in portrait.

## Typography

- Headings / song title: **Space Grotesk** 700 (Google Fonts)
- Everything else: **Inter** 400/500/600
- Song title 44px, artist line 18px, small caps labels 12–13px with 0.12–0.14em letter-spacing.

## Themes (CSS custom properties)

| Token        | Parchment (default) | Caramel   | Used for |
|--------------|---------------------|-----------|----------|
| `--bg`       | `#ddd3c1`           | `#7a5a40` | page background |
| `--plinth`   | `#b99f7f`           | `#9b7757` | turntable body |
| `--arm-base` | `#b08d57`           | `#c9a55c` | brass tonearm pivot |
| `--text`     | `#28221c`           | `#f6eee2` | main text |
| `--muted`    | `#5a4e41`           | `#efe2d0` | secondary text, spin dropdown |
| `--track`    | `#c9bda9`           | `#8f6d51` | progress bar background |
| `--soft`     | `#d0c5b2`           | `#86644a` | prev/next buttons, Up next card |
| `--accent`   | `#6e4b30`           | `#f1e4cf` | play button, progress fill, status dot |
| `--on-accent`| `#f3ecdf`           | `#5a3f2a` | icon on the play button |

Fixed colors: platter `#1a1a1c`; record grooves alternate `#141416` / `#202024` (2px rings);
tonearm `#f7f5f1`; headshell `#2a2a2e`; spindle `#e8e6e1`.

## Turntable geometry (landscape reference)

- Plinth 640×738, radius 28px.
- Platter 520px circle; record 500px; **label 220px circle showing the album cover**.
- Tonearm pivot at the top-right of the plinth; arm rotates around its top end:
  **4° = resting (off the record)**, **24° = playing (on the record)**, 700 ms ease-in-out.
- Spin: CSS `@keyframes` rotate 0→360°, `linear infinite`; duration = selected seconds (default 5s).
  Pause with `animation-play-state: paused` so it stops in place.

## Controls

- Play/Pause: 80px circle, `--accent` background. Prev/Next: 56px circles, `--soft`.
- All touch targets ≥ 44px.
- Spin dropdown: transparent background, no border, 12px `--muted` text — deliberately low-attention.
- Up next card: 60px rounded cover, "UP NEXT" label, title, artist; `--soft` background, 18px radius.

## Motion

- Arm swing 700 ms; cover crossfade 300 ms.
- `prefers-reduced-motion: reduce` → no spin, no arm transition.

## Don'ts

- No Spotify logo or Spotify green (we're not Spotify; just say "Continue with Spotify").
- No emoji, no gradient backgrounds, no fake status bars.
