// Startup and wiring: login vs player view, settings, polling Spotify for what's playing,
// playback controls and the Up next card.

import { initPlayerUI, renderTrack, renderIdle, renderUpNext, renderProgress, setPlaying, setSpinSeconds, setTheme, showToast, setOffline } from './player-ui.js';
import { login, logout, handleRedirect, isLoggedIn, AuthError } from './auth.js';
import { getCurrentlyPlaying, getQueue, play, pause, skipToNext, skipToPrevious, RateLimitError, ApiError } from './spotify.js';

const STAGE_W = 1194;
const STAGE_H = 834;
const SPIN_KEY = 'turntable.spinSeconds';
const THEME_KEY = 'turntable.theme';
const SPIN_CHOICES = ['1', '3', '5', '7', '10'];
const THEMES = ['parchment', 'caramel'];

const POLL_MS = 5000;
const CONFIRM_MS = 600;   // after a button press, ask Spotify again this soon to confirm
const AD = { id: 'ad', title: 'Advertisement', artist: '', album: '', durationMs: 0, coverUrl: null };

// Progress is stored as "where Spotify said we were at updatedAt"; the current position is
// worked out from the clock, so the bar moves smoothly between the 5-second polls.
const state = { track: null, isPlaying: false, progressMs: 0, updatedAt: performance.now() };

let polling = false;        // true while the player view is showing
let pollInFlight = false;   // never run two requests at once
let pollTimer = null;
let endPollRequested = false;
// Bumped on every button press. A poll that started before the press carries old news,
// so its result is thrown away instead of undoing the instant on-screen change.
let actionSeq = 0;
let upNext = null;      // next track in the queue, if known
let queueFor = null;    // id of the track the Up next card belongs to

function currentProgress() {
  if (!state.track) return 0;
  const progress = state.isPlaying ? state.progressMs + (performance.now() - state.updatedAt) : state.progressMs;
  return Math.min(progress, state.track.durationMs);
}

// Update the screen from a getCurrentlyPlaying() result.
function applyPlayback(playback) {
  const track = playback?.type === 'ad' ? AD : playback?.track;
  if (!track) {
    renderIdle();
    state.track = null;
    state.isPlaying = false;
    upNext = null;
    queueFor = null;
    return;
  }
  if (track.id !== state.track?.id) {
    renderTrack(track, { canSkip: track !== AD });
    endPollRequested = false;
  }
  if (track === AD) {
    upNext = null;
    queueFor = AD.id;
    renderUpNext(null);
  } else if (track.id !== queueFor) {
    refreshQueue(track.id);
  }
  state.track = track;
  state.isPlaying = playback.isPlaying;
  state.progressMs = playback.progressMs;
  state.updatedAt = performance.now();
  setPlaying(state.isPlaying);
}

async function poll() {
  if (pollInFlight) return;
  pollInFlight = true;
  clearTimeout(pollTimer);
  let delay = POLL_MS;
  const seq = actionSeq;
  try {
    const playback = await getCurrentlyPlaying();
    setOffline(false);
    if (seq === actionSeq) applyPlayback(playback);
    else delay = CONFIRM_MS;
  } catch (error) {
    if (error instanceof AuthError) {
      stopPolling();
      showLogin(error.message);
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      // Account not in the dashboard's User Management, or Premium lapsed.
      logout();
      stopPolling();
      showLogin('Spotify refused access for this account. Check it\'s added under User Management in the Spotify dashboard, and that Premium is active.');
      return;
    }
    if (error instanceof RateLimitError) delay = error.retryAfterSeconds * 1000;
    // fetch() itself failing means no connection; keep the last state and keep retrying.
    else if (!(error instanceof ApiError)) setOffline(true);
  } finally {
    pollInFlight = false;
  }
  clearTimeout(pollTimer);
  if (polling && !document.hidden) pollTimer = setTimeout(poll, delay);
}

// Only fetched when the song changes, not on every poll.
async function refreshQueue(trackId) {
  queueFor = trackId;
  let next = null;
  try { next = await getQueue(); } catch { /* card just stays hidden; the poll handles login problems */ }
  if (queueFor !== trackId) return;   // the song changed again while we waited
  upNext = next;
  renderUpNext(next);
}

// Runs a button press: change the screen right away, tell Spotify, then double-check shortly after.
async function control(showInstantly, callSpotify) {
  actionSeq++;
  showInstantly();
  try {
    await callSpotify();
  } catch (error) {
    if (error instanceof AuthError) {
      showLogin(error.message);
      return;
    }
    showToast(controlErrorMessage(error));
  }
  actionSeq++;   // polls that ran during the call may predate it too
  clearTimeout(pollTimer);
  if (polling && !document.hidden) pollTimer = setTimeout(poll, CONFIRM_MS);
}

function controlErrorMessage(error) {
  if (error instanceof ApiError && error.status === 404) return 'Open Spotify on a device first.';
  if (error instanceof ApiError && error.status === 403) return 'Spotify didn\'t allow that right now.';
  if (error instanceof RateLimitError) return 'Too many taps. Try again in a moment.';
  if (error instanceof ApiError) return 'Spotify had a problem. Try again.';
  return 'Can\'t reach Spotify. Check your connection.';
}

function togglePlay() {
  const shouldPlay = !state.isPlaying;
  control(() => {
    if (!state.track) return;   // nothing playing: wait for Spotify to report what started
    state.progressMs = currentProgress();
    state.updatedAt = performance.now();
    state.isPlaying = shouldPlay;
    setPlaying(shouldPlay);
  }, shouldPlay ? play : pause);
}

function nextTrack() {
  control(() => {
    if (!upNext) return;
    // We already know what's next, so show it straight away.
    state.track = upNext;
    state.isPlaying = true;
    state.progressMs = 0;
    state.updatedAt = performance.now();
    endPollRequested = false;
    renderTrack(upNext);
    setPlaying(true);
    renderUpNext(null);
    upNext = null;
  }, skipToNext);
}

function previousTrack() {
  control(() => {}, skipToPrevious);
}

function startPolling() {
  polling = true;
  poll();
}

function stopPolling() {
  polling = false;
  clearTimeout(pollTimer);
}

function tick() {
  const progress = currentProgress();
  renderProgress(progress, state.track?.durationMs ?? 0);
  // Song just ended: ask Spotify for the next one now instead of waiting up to 5 s.
  if (state.track && state.isPlaying && state.track.durationMs && progress >= state.track.durationMs && !endPollRequested) {
    endPollRequested = true;
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, 1000);
  }
}

// localStorage can throw (private mode, blocked storage); settings are a nice-to-have.
function loadSetting(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch { return fallback; }
}
function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

// Scale the fixed design (1194×834 landscape, 834×1194 portrait) to fill the screen without distorting it.
const portrait = window.matchMedia('(orientation: portrait)');
function fitStage() {
  const [w, h] = portrait.matches ? [STAGE_H, STAGE_W] : [STAGE_W, STAGE_H];
  const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
  document.documentElement.style.setProperty('--scale', scale);
}

function wireSettings() {
  const spinSelect = document.getElementById('spin');
  const themeSelect = document.getElementById('theme');

  spinSelect.value = loadSetting(SPIN_KEY, SPIN_CHOICES, '5');
  setSpinSeconds(Number(spinSelect.value));
  spinSelect.addEventListener('change', () => {
    setSpinSeconds(Number(spinSelect.value));
    saveSetting(SPIN_KEY, spinSelect.value);
  });

  themeSelect.value = loadSetting(THEME_KEY, THEMES, 'parchment');
  setTheme(themeSelect.value);
  themeSelect.addEventListener('change', () => {
    setTheme(themeSelect.value);
    saveSetting(THEME_KEY, themeSelect.value);
  });
}

function wireMenu() {
  const button = document.getElementById('menu-btn');
  const panel = document.getElementById('menu-panel');
  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(panel.hidden));
  // Tapping anywhere outside the menu closes it.
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !event.target.closest('.menu')) setOpen(false);
  });
}

function showLogin(errorMessage = '') {
  const error = document.getElementById('login-error');
  error.textContent = errorMessage;
  error.hidden = !errorMessage;
  document.getElementById('login-btn').disabled = false;
  document.getElementById('player').hidden = true;
  document.getElementById('login').hidden = false;
  stopPolling();
}

function showPlayer() {
  document.getElementById('login').hidden = true;
  document.getElementById('player').hidden = false;
  startPolling();
}

function wireAuth() {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.addEventListener('click', async () => {
    loginBtn.disabled = true;   // avoid double taps while the browser leaves for Spotify
    try {
      await login();
    } catch (error) {
      showLogin(error instanceof AuthError ? error.message : 'Something went wrong. Please try again.');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    document.getElementById('menu-btn').click();   // close the menu so it's shut next time
    showLogin();
  });

  // Coming back with the browser's Back button can restore a page with the button still disabled.
  window.addEventListener('pageshow', () => { loginBtn.disabled = false; });
}

// Finish a login if Spotify just sent us back, then pick the right view.
async function route() {
  try {
    await handleRedirect();
  } catch (error) {
    showLogin(error instanceof AuthError ? error.message : 'Couldn\'t reach Spotify. Check your connection and try again.');
    return;
  }
  if (isLoggedIn()) showPlayer();
  else showLogin();
}

function start() {
  fitStage();
  window.addEventListener('resize', fitStage);
  portrait.addEventListener('change', fitStage);

  initPlayerUI();
  wireSettings();
  wireMenu();
  wireAuth();
  route();

  document.getElementById('play').addEventListener('click', togglePlay);
  document.getElementById('platter').addEventListener('click', togglePlay);
  document.getElementById('next').addEventListener('click', nextTrack);
  document.getElementById('prev').addEventListener('click', previousTrack);
  setInterval(tick, 250);

  // Don't poll while the screen is off or the app is in the background; catch up straight away on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(pollTimer);
    else if (polling) poll();
  });
  // Back online: don't wait for the next 5-second check.
  window.addEventListener('online', () => { if (polling) poll(); });
  window.addEventListener('offline', () => setOffline(true));
}

start();
