// Spotify login with Authorization Code + PKCE. Browser only, no client secret.
// Tokens live in this browser's localStorage and nowhere else.

import { CLIENT_ID, REDIRECT_URI, SCOPES } from './config.js';

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const TOKENS_KEY = 'turntable.tokens';
const PENDING_KEY = 'turntable.pendingLogin';   // verifier + state while we're away at Spotify
const EXPIRY_MARGIN_MS = 60_000;                 // refresh a minute early so calls never use a dying token

// Thrown when the user has to log in again. The message is safe to show on screen.
export class AuthError extends Error {}

let refreshing = null;   // shared promise so parallel calls trigger only one refresh

// Sends the browser to Spotify's own login page.
export async function login() {
  if (!CLIENT_ID) throw new AuthError('This app has no Spotify Client ID yet (js/config.js).');
  if (location.hostname === 'localhost') {
    throw new AuthError('Spotify doesn\'t accept "localhost". Open http://127.0.0.1:8000 instead.');
  }

  const verifier = randomString(64);
  const state = randomString(16);
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  save(PENDING_KEY, { verifier, state });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  location.assign(`${AUTHORIZE_URL}?${params}`);
}

// If Spotify just sent us back (?code=… or ?error=…), finish the login.
// Does nothing on a normal page load. Throws AuthError if the login failed.
export async function handleRedirect() {
  const params = new URLSearchParams(location.search);
  if (!params.has('code') && !params.has('error')) return;

  const pending = load(PENDING_KEY);
  remove(PENDING_KEY);
  try {
    if (params.get('error') === 'access_denied') throw new AuthError('Login was cancelled.');
    if (params.has('error')) throw new AuthError('Spotify couldn\'t log you in. Please try again.');
    // state must match what we sent, otherwise this callback didn't come from our login.
    if (!pending || params.get('state') !== pending.state) {
      throw new AuthError('That login didn\'t match. Please try again.');
    }
    await requestTokens({
      grant_type: 'authorization_code',
      code: params.get('code'),
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: pending.verifier,
    });
  } finally {
    // The code is single-use; keep it out of the address bar and browser history.
    history.replaceState(null, '', location.pathname);
  }
}

export function isLoggedIn() {
  return Boolean(load(TOKENS_KEY)?.refreshToken);
}

export function logout() {
  remove(TOKENS_KEY);
  remove(PENDING_KEY);
}

// Returns a valid access token, refreshing it first if it's about to expire.
export async function getAccessToken() {
  const tokens = load(TOKENS_KEY);
  if (!tokens) throw new AuthError('Please log in.');
  if (Date.now() < tokens.expiresAt - EXPIRY_MARGIN_MS) return tokens.accessToken;
  return refreshAccessToken();
}

// Also used after a 401 from the API (Phase 3).
export function refreshAccessToken() {
  refreshing ??= (async () => {
    const tokens = load(TOKENS_KEY);
    if (!tokens?.refreshToken) throw new AuthError('Please log in.');
    return requestTokens({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: CLIENT_ID,
    });
  })().finally(() => { refreshing = null; });
  return refreshing;
}

// POSTs to Spotify's token endpoint and stores the result. Returns the access token.
async function requestTokens(body) {
  // A network failure (offline) is NOT an auth failure: let it throw as-is so we keep the tokens.
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    // Spotify refused (expired/revoked refresh token, user removed from allowlist…): start over.
    logout();
    throw new AuthError('Your Spotify login expired. Please log in again.');
  }
  const data = await response.json();
  const previous = load(TOKENS_KEY);
  save(TOKENS_KEY, {
    accessToken: data.access_token,
    // Spotify may or may not send a new refresh token; keep the old one if not.
    refreshToken: data.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

function randomString(byteCount) {
  return base64url(crypto.getRandomValues(new Uint8Array(byteCount)));
}

// URL-safe base64 without padding, as PKCE requires.
function base64url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// localStorage can throw (private mode, blocked storage).
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* login just won't persist */ }
}
function remove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
