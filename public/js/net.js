// ─────────────────────────────────────────────────────────────
//  Connexion temps réel + magasin d'état minimaliste
// ─────────────────────────────────────────────────────────────
import { io } from '/socket.io/socket.io.esm.min.js';
import { useEffect, useState } from 'preact/hooks';
import { narrate, refreshSamples, setNarrationContext, stopSpeech } from './audio.js';
import { narrationScope } from '/shared/narration.js';

const SESSION_KEY = 'lg_session';
export const session = {
  load() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; } },
  save(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } },
};

const state = {
  connected: false,
  view: null, // { room, game, you }
  chats: {}, // canal -> messages
  writable: [],
  unread: 0,
  narration: null, // dernière réplique { text, seq }
  toast: null,
  clockOffset: 0,
  kicked: false,
};
const subs = new Set();
const emit = () => subs.forEach((f) => f({ ...state }));
export const store = {
  get: () => state,
  set(patch) { Object.assign(state, patch); emit(); },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
};
export function useStore() {
  const [s, set] = useState(() => ({ ...store.get() }));
  useEffect(() => {
    const unsubscribe = store.subscribe(set);
    // La connexion peut aboutir entre le rendu initial et cet abonnement.
    set({ ...store.get() });
    return unsubscribe;
  }, []);
  return s;
}

export const socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });

export const now = () => Date.now() + state.clockOffset;

let toastTimer = null;
export function toast(text, tone = 'info') {
  clearTimeout(toastTimer);
  store.set({ toast: { text, tone, id: Math.random() } });
  toastTimer = setTimeout(() => store.set({ toast: null }), 3800);
}

export function call(event, payload = {}) {
  return new Promise((resolve) => {
    socket.timeout(8000).emit(event, payload, (err, res) => {
      if (err) { toast('Le messager s’est perdu dans la forêt… (délai dépassé)', 'error'); return resolve({ error: 'timeout' }); }
      if (res?.error && res.error !== 'timeout') toast(res.error, 'error');
      resolve(res || {});
    });
  });
}

export async function act(action) { return call('game:action', action); }

function tryRejoin() {
  const s = session.load();
  if (!s?.code || !s?.token) return;
  socket.emit('room:join', { code: s.code, token: s.token, name: s.name }, (r) => {
    if (r?.error) { session.clear(); store.set({ view: null }); }
  });
}

socket.on('connect', () => { store.set({ connected: true }); tryRejoin(); });
socket.on('disconnect', () => { stopSpeech(); store.set({ connected: false }); });
socket.on('state', (view) => {
  setNarrationContext(narrationScope(view.game));
  store.set({ view, clockOffset: view.serverNow - Date.now(), kicked: false });
});
socket.on('chat:history', ({ channels, writable }) => store.set({ chats: channels, writable }));
socket.on('chat:msg', (m) => {
  const list = [...(state.chats[m.ch] || []), m].slice(-120);
  const mine = m.from === state.view?.you;
  store.set({ chats: { ...state.chats, [m.ch]: list }, unread: mine || state.chatOpen ? state.unread : state.unread + 1 });
});
socket.on('narrate', (n) => {
  if (n.update && (n.scope !== narrationScope(state.view?.game) || n.seq !== state.narration?.seq)) return;
  store.set({ narration: n });
  narrate(n);
});
socket.on('sfx:update', () => refreshSamples());
socket.on('kicked', () => { stopSpeech(); session.clear(); store.set({ view: null, kicked: true }); toast('Le meneur vous a chassé du village.', 'error'); });
socket.on('replaced', () => { stopSpeech(); store.set({ view: null }); toast('Session ouverte sur un autre appareil.', 'error'); });

export async function createRoom(name) {
  const r = await call('room:create', { name });
  if (r.ok) session.save({ code: r.code, token: r.token, name });
  return r;
}
export async function joinRoom(code, name) {
  const r = await call('room:join', { code, name });
  if (r.ok) session.save({ code: r.code, token: r.token, name });
  return r;
}
export async function leaveRoom() {
  stopSpeech();
  await call('room:leave');
  session.clear();
  store.set({ view: null, chats: {}, writable: [], narration: null });
}
