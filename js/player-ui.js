// Draws the now-playing screen. Knows about the page, not about Spotify:
// app.js hands it plain track objects { title, artist, album, durationMs, coverUrl }.

const els = {};
let spin = null;          // Web Animation that rotates the record
let spinMs = 5000;        // milliseconds per full turn
let playing = false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initPlayerUI() {
  for (const id of ['player', 'record', 'cover', 'platter', 'play', 'status', 'title', 'subtitle',
    'bar-fill', 'elapsed', 'duration', 'up-next', 'next-cover', 'next-title', 'next-artist', 'prev', 'next',
    'toast']) {
    els[id] = document.getElementById(id);
  }

  // A Web Animation (not a CSS animation) so the speed can change without the record jumping.
  spin = els.record.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: spinMs, iterations: Infinity, easing: 'linear' }
  );
  spin.pause();
  reducedMotion.addEventListener('change', updateSpin);
}

// canSkip: false for ads, which Spotify won't let you skip.
export function renderTrack(track, { canSkip = true } = {}) {
  els.title.textContent = track.title;
  els.subtitle.textContent = [track.artist, track.album].filter(Boolean).join(' · ');
  els.duration.textContent = formatTime(track.durationMs);
  if (track.coverUrl) els.cover.src = track.coverUrl;
  else els.cover.removeAttribute('src');
  els.prev.disabled = !canSkip;
  els.next.disabled = !canSkip;
}

// Nothing playing on any device: arm up, plain label, only Play stays enabled.
export function renderIdle() {
  setPlaying(false);
  els.status.textContent = 'NOTHING PLAYING';
  els.title.textContent = 'Nothing playing';
  els.subtitle.textContent = 'Start music in Spotify on any device.';
  els.duration.textContent = formatTime(0);
  els.cover.removeAttribute('src');
  els.prev.disabled = true;
  els.next.disabled = true;
  renderProgress(0, 0);
  renderUpNext(null);
}

// Pass null to hide the card (empty queue). The card loads the same full-size cover URL
// the label will use, so it also preloads the next label image.
export function renderUpNext(track) {
  els['up-next'].hidden = !track;
  if (!track) return;
  els['next-title'].textContent = track.title;
  els['next-artist'].textContent = track.artist;
  if (track.coverUrl) els['next-cover'].src = track.coverUrl;
  else els['next-cover'].removeAttribute('src');
}

export function renderProgress(progressMs, durationMs) {
  const fraction = durationMs ? Math.min(progressMs / durationMs, 1) : 0;
  els['bar-fill'].style.width = `${fraction * 100}%`;
  els.elapsed.textContent = formatTime(progressMs);
}

export function setPlaying(isPlaying) {
  playing = isPlaying;
  els.player.classList.toggle('is-playing', isPlaying);
  els.status.textContent = isPlaying ? 'NOW PLAYING' : 'PAUSED';
  els.play.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  els.platter.setAttribute('aria-label', isPlaying ? 'Tap the record to pause' : 'Tap the record to play');
  updateSpin();
}

// Short message at the bottom of the screen that disappears on its own.
let toastTimer = null;
export function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3500);
}

export function setSpinSeconds(seconds) {
  // Keep the record at the same angle: remember how far through a turn we are, then
  // place it at that same point of a turn with the new length.
  const turn = ((spin.currentTime ?? 0) % spinMs) / spinMs;
  spinMs = seconds * 1000;
  spin.effect.updateTiming({ duration: spinMs });
  spin.currentTime = turn * spinMs;
}

export function setTheme(name) {
  document.documentElement.dataset.theme = name;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', bg);
}

function updateSpin() {
  // pause() keeps the current angle, so the record stops in place instead of snapping back.
  if (playing && !reducedMotion.matches) spin.play();
  else spin.pause();
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
