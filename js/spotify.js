// Thin wrapper around the Spotify Web API player endpoints.
// Turns Spotify's responses into the plain track objects player-ui.js understands.

import { getAccessToken, refreshAccessToken, logout, AuthError } from './auth.js';

const API_URL = 'https://api.spotify.com/v1';
const DEFAULT_RETRY_SECONDS = 10;   // if a 429 arrives without a readable Retry-After

export class RateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super('Rate limited by Spotify');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ApiError extends Error {
  constructor(status, reason) {
    super(`Spotify API error ${status}`);
    this.status = status;
    this.reason = reason;   // e.g. NO_ACTIVE_DEVICE
  }
}

// What's playing now, or null when nothing is.
// Result: { isPlaying, progressMs, type: 'track' | 'episode' | 'ad' | 'unknown', track }
export async function getCurrentlyPlaying() {
  const data = await request('GET', '/me/player/currently-playing?additional_types=episode');
  if (!data) return null;
  return {
    isPlaying: Boolean(data.is_playing),
    progressMs: data.progress_ms ?? 0,
    type: data.currently_playing_type,
    track: toTrack(data.item),
  };
}

// The next item in the queue as a track object, or null when the queue is empty.
export async function getQueue() {
  const data = await request('GET', '/me/player/queue');
  return toTrack(data?.queue?.[0]);
}

// Playback controls act on whichever device is currently active.
// Without one, Spotify answers 404 NO_ACTIVE_DEVICE (thrown as ApiError).
export const play = () => request('PUT', '/me/player/play');
export const pause = () => request('PUT', '/me/player/pause');
export const skipToNext = () => request('POST', '/me/player/next');
export const skipToPrevious = () => request('POST', '/me/player/previous');

// Calls the API with a fresh token. Returns parsed JSON, or null when there's no body (204).
async function request(method, path) {
  let response = await send(method, path, await getAccessToken());
  if (response.status === 401) {
    // Token was rejected early (e.g. revoked); refresh once and retry.
    response = await send(method, path, await refreshAccessToken());
  }
  if (response.status === 401) {
    logout();
    throw new AuthError('Your Spotify login expired. Please log in again.');
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After'));
    throw new RateLimitError(seconds > 0 ? seconds : DEFAULT_RETRY_SECONDS);
  }
  if (response.status === 204) return null;
  if (!response.ok) throw new ApiError(response.status, await readReason(response));

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function send(method, path, token) {
  return fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
}

async function readReason(response) {
  try { return (await response.json())?.error?.reason ?? ''; } catch { return ''; }
}

// Songs and podcast episodes have different shapes; both become { id, title, artist, album, durationMs, coverUrl }.
function toTrack(item) {
  if (!item) return null;
  if (item.type === 'episode') {
    return {
      id: item.uri,
      title: item.name,
      artist: item.show?.name ?? '',
      album: '',
      durationMs: item.duration_ms ?? 0,
      coverUrl: largestImage(item.images?.length ? item.images : item.show?.images),
    };
  }
  return {
    id: item.uri,
    title: item.name,
    artist: (item.artists ?? []).map((artist) => artist.name).join(', '),
    album: item.album?.name ?? '',
    durationMs: item.duration_ms ?? 0,
    coverUrl: largestImage(item.album?.images),
  };
}

// Biggest image from Spotify's CDN (security rule 8: only i.scdn.co images).
function largestImage(images = []) {
  const allowed = images.filter((image) => image.url?.startsWith('https://i.scdn.co/'));
  allowed.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return allowed[0]?.url ?? null;
}
