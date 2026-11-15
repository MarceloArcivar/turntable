// Public settings only. The Client ID is public by design (PKCE) — never put a client secret here.

// From developer.spotify.com/dashboard → your app → Settings → Client ID.
export const CLIENT_ID = '3669ad98e8344dd5a8f6900ea1dc2bbd';

// The folder this page is served from, e.g. http://127.0.0.1:8000/ locally or
// https://<user>.github.io/turntable/ online. Must exactly match a Redirect URI in the dashboard.
export const REDIRECT_URI = new URL('./', window.location.href).href;

// Ask the owner before adding anything here (CLAUDE.md, security rule 3).
export const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
];
