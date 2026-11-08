// ─────────────────────────────────────────────────────────────
//  Son : narration (ElevenLabs → Web Speech en secours), ambiance, effets
//  Toute l'ambiance est synthétisée en WebAudio : aucun fichier requis.
// ─────────────────────────────────────────────────────────────
const prefs = {
  get(k, d) { try { const v = localStorage.getItem(`lg_${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`lg_${k}`, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

const VOICE_RATE = 1;
let ctx = null;
let master = null;
let ambience = null;
let unlocked = false;

export const audioPrefs = {
  voice: prefs.get('voice', null), // null = pas encore choisi
  ambience: prefs.get('ambience', true),
  setVoice(v) { this.voice = v; prefs.set('voice', v); if (!v) stopSpeech(); },
  setAmbience(v) { this.ambience = v; prefs.set('ambience', v); v ? startAmbience(currentMood) : stopAmbience(); },
};

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    if (audioPrefs.ambience && currentMood) startAmbience(currentMood);
    for (const n of sampleList) loadSample(n);
  } catch { ctx = null; }
  // Débloque la synthèse vocale sur iOS
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* indisponible */ }
}

// ── Narration ────────────────────────────────────────────────
let speaking = false;
let currentAudio = null;
let frVoice = null;
let generation = 0;
let currentKey = null;
let dismissedKey = null;
let currentScope = null;
let started = false;
let waitForAudio = null;
let speechWatchdog = null;
const listeners = new Set();
export function onNarrationState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const isNarrating = () => speaking;
const notify = (s) => listeners.forEach((f) => f(s));

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('fr'));
  const prefer = ['thomas', 'daniel', 'henri', 'paul', 'nicolas', 'mathieu', 'google français', 'microsoft paul', 'microsoft claude'];
  return voices.find((v) => prefer.some((p) => v.name.toLowerCase().includes(p))) || voices[0] || null;
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { frVoice = pickVoice(); };
  frVoice = pickVoice();
}

export function narrate(item) {
  if (!audioPrefs.voice || !item.text) return;
  const key = `${item.at || ''}:${item.seq ?? item.text}`;
  if (key === dismissedKey) return;
  if (currentKey === key) {
    // L’audio peut compléter le sous-titre, mais une phrase déjà lue ne repart pas.
    if (!started && (item.audio || !item.pendingAudio)) beginNarration(item);
    return;
  }
  stopSpeech({ dismiss: false });
  currentKey = key;
  currentScope = item.scope ?? null;
  if (item.pendingAudio) {
    const token = generation;
    waitForAudio = setTimeout(() => { if (token === generation) beginNarration({ ...item, audio: null }); }, 1800);
  } else beginNarration(item);
}

export function setNarrationContext(scope) {
  if (currentScope !== null && currentScope !== scope) stopSpeech();
}

function beginNarration(item) {
  clearTimeout(waitForAudio);
  started = true;
  speaking = true;
  duck(true);
  notify(true);
  const token = generation;
  let finished = false;
  const done = () => {
    if (token !== generation || finished) return;
    finished = true;
    clearTimeout(speechWatchdog);
    currentAudio = null;
    speaking = false;
    duck(false);
    notify(false);
  };
  if (!item.audio) { speak(item.text, done, token); return; }
  const a = new Audio(item.audio);
  currentAudio = a;
  a.volume = 1;
  a.preservesPitch = true;
  a.playbackRate = VOICE_RATE;
  let fallbackStarted = false;
  const fallback = () => {
    if (token !== generation || fallbackStarted || finished) return;
    fallbackStarted = true;
    a.onended = a.onerror = null;
    a.pause();
    currentAudio = null;
    speak(item.text, done, token);
  };
  a.onended = done;
  a.onerror = fallback;
  a.play().catch(fallback);
}

function speak(text, done, token = generation) {
  if (!('speechSynthesis' in window)) return done();
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    frVoice = frVoice || pickVoice();
    if (frVoice) u.voice = frVoice;
    u.rate = .93;
    u.pitch = .95;
    u.volume = 1;
    let finished = false;
    const end = () => {
      if (finished || token !== generation) return;
      finished = true;
      clearTimeout(speechWatchdog);
      done();
    };
    u.onend = end;
    u.onerror = end;
    speechWatchdog = setTimeout(() => {
      if (token !== generation) return;
      speechSynthesis.cancel();
      end();
    }, Math.max(5000, text.length * 100));
    speechSynthesis.speak(u);
  } catch { done(); }
}

export function stopSpeech({ dismiss = true } = {}) {
  if (dismiss && currentKey) dismissedKey = currentKey;
  generation++;
  clearTimeout(waitForAudio);
  clearTimeout(speechWatchdog);
  if (currentAudio) {
    currentAudio.onended = currentAudio.onerror = null;
    try { currentAudio.pause(); } catch { /* ignore */ }
    currentAudio = null;
  }
  currentKey = currentScope = null;
  started = false;
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  speaking = false;
  duck(false);
  notify(false);
}

export function playUrlOnce(url, text, scope = null) {
  stopSpeech();
  currentScope = scope;
  beginNarration({ audio: url, text });
}

// ── Ambiance ─────────────────────────────────────────────────
let currentMood = null;

function noiseBuffer(seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02; // bruit brun
    d[i] = last * 3.2;
  }
  return buf;
}

function startAmbience(mood) {
  currentMood = mood;
  if (!ctx || !audioPrefs.ambience) return;
  stopAmbience(0.8);
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(master);
  const nodes = [];

  // Vent
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = mood === 'night' ? 420 : mood === 'vote' ? 300 : 650;
  lp.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);
  const windGain = ctx.createGain();
  windGain.gain.value = mood === 'day' ? 0.12 : 0.22;
  src.connect(lp).connect(windGain).connect(out);
  src.start();
  lfo.start();
  nodes.push(src, lfo);

  // Bourdon grave
  const base = mood === 'vote' ? 55 : mood === 'day' ? 73.4 : 49;
  for (const [mult, g] of [[1, 0.05], [1.5, 0.025], [2.01, 0.018]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = base * mult;
    const og = ctx.createGain();
    og.gain.value = g;
    o.connect(og).connect(out);
    o.start();
    nodes.push(o);
  }
  out.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 3);
  ambience = { out, nodes };
}

function stopAmbience(fade = 0.6) {
  if (!ambience || !ctx) return;
  const { out, nodes } = ambience;
  ambience = null;
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } }), fade * 1000 + 100);
}

function duck(on) {
  if (!ambience || !ctx) return;
  const g = ambience.out.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(on ? 0.2 : 0.55, ctx.currentTime + 0.6);
}

export function setMood(mood) {
  if (mood === currentMood) return;
  currentMood = mood;
  startAmbience(mood);
}

// ── Bruitages réels (générés par ElevenLabs côté serveur) ─────
const samples = new Map(); // nom -> AudioBuffer | Promise
let sampleList = [];
export async function refreshSamples() {
  try {
    sampleList = await (await fetch('/api/sfx')).json();
    if (ctx) for (const n of sampleList) loadSample(n);
  } catch { /* hors ligne */ }
}
function loadSample(name) {
  if (samples.has(name) || !ctx) return;
  samples.set(name, fetch(`/sfx/${name}.mp3`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))
    .then((buf) => { samples.set(name, buf); return buf; }).catch(() => samples.delete(name)));
}
/** Joue un bruitage enregistré s'il existe ; sinon retourne false. */
function sample(name, { gain = 0.9, rate = 1, delay = 0 } = {}) {
  const buf = samples.get(name);
  if (!ctx || !(buf instanceof AudioBuffer)) return false;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  src.start(ctx.currentTime + delay);
  return true;
}
refreshSamples();
setInterval(() => { if (sampleList.length < 15) refreshSamples(); }, 45000);

// ── Effets ───────────────────────────────────────────────────
function env(gainNode, t, a, d, peak) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function osc(type, f, t, dur, peak, dest = master) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  env(g, t, Math.min(0.05, dur / 4), dur, peak);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.1);
  return o;
}
function noise(t, dur, { type = 'lowpass', freq = 800, q = 0.7, peak = 0.3, attack = 0.01 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(Math.max(0.5, dur + 0.2));
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, dur, peak);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  return f;
}

export const sfx = {
  /** Coq au lever du jour */
  rooster() {
    if (!ctx || sample('rooster', { gain: 0.9 })) return;
    const t = ctx.currentTime + 0.05;
    // « Co-co-ri-coooo » : 4 syllabes, voix nasillarde (dents de scie + formants)
    const notes = [[0, 0.13, 620, 780], [0.17, 0.13, 760, 900], [0.34, 0.2, 880, 1020], [0.6, 1.05, 1080, 760]];
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1500; f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2900; f2.Q.value = 5;
    const out = ctx.createGain(); out.gain.value = 0.7;
    f1.connect(out); f2.connect(out); out.connect(master);
    for (const [dt, d, fa, fb] of notes) {
      const o = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(fa, t + dt);
      o.frequency.linearRampToValueAtTime(fb, t + dt + d * 0.7);
      if (d > 0.5) o.frequency.linearRampToValueAtTime(fb * 0.85, t + dt + d);
      vib.frequency.value = d > 0.5 ? 9 : 14; vg.gain.value = d > 0.5 ? 38 : 20;
      vib.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.22, t + dt + 0.03);
      g.gain.setValueAtTime(0.22, t + dt + d * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
      o.connect(g); g.connect(f1); g.connect(f2);
      o.start(t + dt); vib.start(t + dt); o.stop(t + dt + d + 0.05); vib.stop(t + dt + d + 0.05);
    }
    // Quelques oiseaux au loin
    for (let i = 0; i < 5; i++) {
      const tt = t + 1.9 + i * 0.35 + Math.random() * 0.2;
      const o = osc('sine', 3200 + Math.random() * 900, tt, 0.09, 0.03);
      o.frequency.exponentialRampToValueAtTime(4200, tt + 0.08);
    }
  },
  /** Hurlement de loup (ralenti, deux voix) */
  howl() {
    if (!ctx || sample('howl', { gain: 0.8 })) return;
    const t = ctx.currentTime;
    for (const [det, delay, peak] of [[0, 0, 0.09], [-7, 0.5, 0.05]]) {
      const o = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vg = ctx.createGain();
      const g = ctx.createGain();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 1.6;
      o.type = 'sawtooth';
      o.detune.value = det * 10;
      const s = t + delay;
      o.frequency.setValueAtTime(260, s);
      o.frequency.linearRampToValueAtTime(520, s + 1.2);
      o.frequency.linearRampToValueAtTime(500, s + 3);
      o.frequency.linearRampToValueAtTime(300, s + 4.4);
      vib.frequency.value = 5; vg.gain.value = 8;
      vib.connect(vg).connect(o.frequency);
      env(g, s, 0.8, 3.8, peak);
      o.connect(bp).connect(g).connect(master);
      o.start(s); vib.start(s); o.stop(s + 4.8); vib.stop(s + 4.8);
    }
  },
  /** Tombée de la nuit : chouette + vent */
  nightfall() {
    if (!ctx || sample('nightfall', { gain: 0.8 })) return;
    const t = ctx.currentTime + 0.4;
    for (const [dt, d] of [[0, 0.35], [0.55, 0.9]]) {
      const o = osc('sine', 420, t + dt, d, 0.07);
      o.frequency.linearRampToValueAtTime(380, t + dt + d);
    }
    noise(t, 4, { freq: 500, peak: 0.12, attack: 1.2 });
  },
  bell() {
    if (!ctx || sample('bell', { gain: 0.75 })) return;
    const t = ctx.currentTime;
    for (const [f, a] of [[98, 0.16], [196, 0.12], [233, 0.05], [294, 0.06], [392, 0.04], [523, 0.025]]) osc('sine', f, t, 6, a);
  },
  /** Impact cinématographique (révélations) */
  reveal() {
    if (!ctx || sample('reveal', { gain: 0.85 })) return;
    const t = ctx.currentTime;
    const o = osc('sine', 110, t, 2.6, 0.55);
    o.frequency.exponentialRampToValueAtTime(32, t + 2.2);
    noise(t, 1.6, { freq: 300, peak: 0.35 });
    const f = noise(t, 2.2, { type: 'bandpass', freq: 2000, q: 0.6, peak: 0.12, attack: 0.6 });
    f.frequency.exponentialRampToValueAtTime(200, t + 2.2);
  },
  /** Révélation d'un mort : impact + chœur sombre */
  death() {
    if (!ctx) return;
    if (!sample('death', { gain: 0.8 })) {
      sfx.reveal();
      const t = ctx.currentTime + 0.1;
      for (const f of [146.8, 174.6, 220, 293.7]) {
        const o = osc('sawtooth', f, t, 3.4, 0.022);
        o.detune.value = (Math.random() - 0.5) * 14;
      }
    }
  },
  /** Souffle de transition au ralenti */
  whoosh() {
    if (!ctx || sample('whoosh', { gain: 0.6 })) return;
    const t = ctx.currentTime;
    const f = noise(t, 2.4, { type: 'bandpass', freq: 300, q: 1.2, peak: 0.25, attack: 1.4 });
    f.frequency.exponentialRampToValueAtTime(2400, t + 1.6);
  },
  flip() {
    if (!ctx || sample('flip', { gain: 0.7 })) return;
    noise(ctx.currentTime, 0.25, { type: 'highpass', freq: 1200, peak: 0.25, attack: 0.02 });
  },
  heartbeat() {
    if (!ctx || sample('heartbeat', { gain: 0.8 })) return;
    const t = ctx.currentTime;
    for (const dt of [0, 0.22]) {
      const o = osc('sine', 70, t + dt, 0.2, dt ? 0.18 : 0.28);
      o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.18);
    }
  },
  tick() {
    if (!ctx) return;
    osc('sine', 1400, ctx.currentTime, 0.06, 0.05);
  },
  fire() {
    if (!ctx || sample('fire', { gain: 0.8 })) return;
    const t = ctx.currentTime;
    noise(t, 3, { type: 'bandpass', freq: 900, q: 0.5, peak: 0.3, attack: 0.4 });
    for (let i = 0; i < 26; i++) noise(t + Math.random() * 2.6, 0.03, { type: 'highpass', freq: 2500, peak: 0.25 });
  },
  shot() {
    if (!ctx || sample('shot', { gain: 0.9 })) return;
    const t = ctx.currentTime;
    const f = noise(t, 1.4, { freq: 3000, peak: 0.9, attack: 0.003 });
    f.frequency.exponentialRampToValueAtTime(180, t + 1);
  },
  council() { if (ctx) sample('council', { gain: 0.55 }); },
  raven() { if (ctx) sample('raven', { gain: 0.7 }); },
  victory(wolves) {
    if (!ctx) return;
    if (sample(wolves ? 'wolves_win' : 'victory', { gain: 0.8 })) return;
    if (wolves) return sfx.howl();
    const t = ctx.currentTime;
    [[261.6, 0], [329.6, 0.25], [392, 0.5], [523.2, 0.8]].forEach(([f, dt]) => osc('triangle', f, t + dt, 1.8, 0.08));
    sfx.bell();
  },
};
