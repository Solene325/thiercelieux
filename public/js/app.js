// ─────────────────────────────────────────────────────────────
//  Point d'entrée : routage selon l'état du salon
// ─────────────────────────────────────────────────────────────
import { roleImagesReady } from './art.js';
import { html, render } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { useStore } from './net.js';
import { setMood, unlockAudio } from './audio.js';
import { initParticles, setParticleMood } from './components/Particles.js';
import { Landing } from './screens/Landing.js';
import { Lobby } from './screens/Lobby.js';
import { GameShell, phaseMood } from './screens/GameShell.js';

initParticles();
// Le premier geste de l'utilisateur débloque l'audio (contrainte des navigateurs mobiles)
['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, unlockAudio, { once: true, passive: true }));

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* refusé */ }
}

function App() {
  const s = useStore();
  const { view } = s;
  const game = view?.game;
  const mood = view ? (game ? phaseMood(game) : 'tavern') : 'night';

  useEffect(() => {
    document.body.dataset.mood = mood;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0d1420');
    setParticleMood(mood);
    setMood(mood === 'tavern' ? 'night' : mood);
  }, [mood]);
  useEffect(() => {
    keepAwake(!!game);
    const vis = () => document.visibilityState === 'visible' && game && keepAwake(true);
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [!!game]);

  let screen;
  if (!view) screen = html`<${Landing} />`;
  else if (!game) screen = html`<${Lobby} view=${view} chats=${s.chats} writable=${s.writable} unread=${s.unread} />`;
  else screen = html`<${GameShell} view=${view} chats=${s.chats} writable=${s.writable} unread=${s.unread} narration=${s.narration} />`;

  return html`
    ${screen}
    ${!s.connected && html`<div class="offline-banner"><span class="dots"><i></i><i></i><i></i></span>Le messager cherche le chemin du village…</div>`}
    ${s.toast && html`<div class="toast tone-${s.toast.tone}" key=${s.toast.id} role="alert">${s.toast.text}</div>`}
  `;
}

roleImagesReady.then(() => render(html`<${App} />`, document.getElementById('app')));
