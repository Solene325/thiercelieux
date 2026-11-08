// ─────────────────────────────────────────────────────────────
//  Salons : joueurs, réglages, chat, narration et diffusion
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import { narrationDuration, narrationScope } from '../shared/narration.js';
import { Game } from './game.js';
import { driveBots, BOT_NAMES } from './bots.js';
import { synthesize, PREWARM, LINES, SLEEP_LINES, VOICE_PRESETS } from './narration.js';
import { generateMissingSfx } from './sfx.js';
import { autoComposition, finalizeComposition, validateComposition, MAX_PLAYERS, ROLES } from '../shared/roles.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHANNELS = ['village', 'loups', 'morts', 'amoureux'];

export const rooms = new Map();

export function generateCode() {
  for (;;) {
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!rooms.has(code)) return code;
  }
}

const DEFAULT_SETTINGS = () => ({
  hostPlays: true,
  roleMode: 'auto',
  custom: { loup: 2, voyante: 1, sorciere: 1, chasseur: 1 },
  revealOnDeath: true,
  deadSeeAll: true,
  timers: { reveal: 40, night: 50, discussion: 180, vote: 75, hunter: 35 },
});

const TIMER_LIMITS = { reveal: [10, 120], night: [15, 120], discussion: [30, 900], vote: [20, 240], hunter: [10, 90] };

export class Room {
  constructor(io, hostName) {
    this.io = io;
    this.code = generateCode();
    this.players = new Map();
    this.settings = DEFAULT_SETTINGS();
    this.voice = { apiKey: null, voiceId: VOICE_PRESETS[0].id, model: 'eleven_multilingual_v2', error: null };
    this.game = null;
    this.chats = Object.fromEntries(CHANNELS.map((c) => [c, []]));
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.narrationChain = Promise.resolve();
    this.narrationSeq = 0;
    this.msgSeq = 0;
    this._emitPending = false;
    this._historyPending = false;
    const host = this.addPlayer(hostName);
    this.hostId = host.id;
    rooms.set(this.code, this);
  }

  // ── Joueurs ────────────────────────────────────────────────
  addPlayer(name, { isBot = false } = {}) {
    const p = {
      isBot,
      id: crypto.randomUUID().slice(0, 8),
      token: crypto.randomBytes(16).toString('hex'),
      name,
      connected: isBot,
      socketId: null,
      joinedAt: Date.now(),
      lastChat: 0,
    };
    this.players.set(p.id, p);
    return p;
  }
  nameOf(id) { return this.players.get(id)?.name || '???'; }
  isHost(id) { return id === this.hostId; }
  isConnected(id) { const p = this.players.get(id); return !!(p && (p.isBot || p.connected)); }
  byToken(token) { for (const p of this.players.values()) if (p.token === token) return p; return null; }
  nameTaken(name) {
    const n = name.toLocaleLowerCase('fr');
    for (const p of this.players.values()) if (p.name.toLocaleLowerCase('fr') === n) return true;
    return false;
  }
  playingIds() {
    return [...this.players.values()]
      .filter((p) => this.settings.hostPlays || p.id !== this.hostId)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.id);
  }
  capacity() { return MAX_PLAYERS + (this.settings.hostPlays ? 0 : 1); }

  attach(player, socket) {
    if (player.socketId && player.socketId !== socket.id) {
      const old = this.io.sockets.sockets.get(player.socketId);
      if (old) { old.data = {}; old.emit('replaced'); old.leave(this.code); }
    }
    player.socketId = socket.id;
    player.connected = true;
    socket.data = { code: this.code, pid: player.id };
    socket.join(this.code);
    this.lastActivity = Date.now();
    this.sendHistory(player.id);
    this.emitState();
  }

  detach(socket) {
    const pid = socket.data?.pid;
    const p = this.players.get(pid);
    if (p && p.socketId === socket.id) {
      p.connected = false;
      p.socketId = null;
      this.emitState();
    }
  }

  addBots(n) {
    if (this.game) return 'Impossible en cours de partie';
    const free = BOT_NAMES.filter((b) => !this.nameTaken(b));
    const room = Math.max(0, this.capacity() - this.players.size);
    const count = Math.min(n, room, free.length);
    if (!count) return 'Le village est complet';
    for (let i = 0; i < count; i++) this.addPlayer(free[i], { isBot: true });
    this.emitState();
    return null;
  }

  removeBots() {
    if (this.game) return 'Impossible en cours de partie';
    for (const p of [...this.players.values()]) if (p.isBot) this.players.delete(p.id);
    this.emitState();
    return null;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (id === this.hostId) {
      const next = [...this.players.values()].filter((p) => !p.isBot).sort((a, b) => a.joinedAt - b.joinedAt)[0];
      this.hostId = next ? next.id : null;
    }
    if (![...this.players.values()].some((p) => !p.isBot)) this.destroy();
    else this.emitState();
  }

  destroy() {
    this.game?.destroy();
    rooms.delete(this.code);
  }

  // ── Réglages / composition ─────────────────────────────────
  updateSettings(patch) {
    if (this.game) return 'Impossible de modifier les réglages en cours de partie';
    const s = this.settings;
    if (typeof patch.hostPlays === 'boolean') s.hostPlays = patch.hostPlays;
    if (patch.roleMode === 'auto' || patch.roleMode === 'custom') s.roleMode = patch.roleMode;
    if (typeof patch.revealOnDeath === 'boolean') s.revealOnDeath = patch.revealOnDeath;
    if (typeof patch.deadSeeAll === 'boolean') s.deadSeeAll = patch.deadSeeAll;
    if (patch.custom && typeof patch.custom === 'object') {
      const c = {};
      for (const [r, v] of Object.entries(patch.custom)) {
        if (!ROLES[r]) continue;
        const limit = r === 'villageois' ? MAX_PLAYERS : ROLES[r].unique ? 1 : 25;
        const n = Math.max(0, Math.min(limit, Math.floor(Number(v) || 0)));
        if (n || r === 'villageois') c[r] = n;
      }
      s.custom = c;
    }
    if (patch.timers && typeof patch.timers === 'object') {
      for (const [k, [lo, hi]] of Object.entries(TIMER_LIMITS)) {
        if (patch.timers[k] != null) s.timers[k] = Math.max(lo, Math.min(hi, Math.round(Number(patch.timers[k]) || lo)));
      }
    }
    this.emitState();
    return null;
  }

  composition() {
    const n = this.playingIds().length;
    const comp = this.settings.roleMode === 'auto' ? autoComposition(n) : finalizeComposition(this.settings.custom, n);
    return { comp, n, error: validateComposition(comp, n) };
  }

  startGame() {
    if (this.game) return 'Une partie est déjà en cours';
    const { comp, error } = this.composition();
    if (error) return error;
    this.chats = Object.fromEntries(CHANNELS.map((c) => [c, []]));
    this.game = new Game(this, this.playingIds(), comp);
    this.game.start();
    this.prewarmVoice();
    return null;
  }

  endGame() {
    if (!this.game) return;
    this.game.destroy();
    this.game = null;
    this.chats = Object.fromEntries(CHANNELS.map((c) => [c, []]));
    this.onPhaseChange();
    this.emitState();
  }

  // ── Diffusion ──────────────────────────────────────────────
  emitState() {
    if (this._emitPending) return;
    this._emitPending = true;
    setTimeout(() => {
      this._emitPending = false;
      const withHistory = this._historyPending;
      this._historyPending = false;
      for (const p of this.players.values()) {
        if (!p.connected || !p.socketId) continue;
        const sock = this.io.sockets.sockets.get(p.socketId);
        if (!sock) continue;
        sock.emit('state', this.viewFor(p.id));
        if (withHistory) sock.emit('chat:history', this.historyFor(p.id));
      }
      driveBots(this);
    }, 25);
  }

  onPhaseChange() { this._historyPending = true; this.emitState(); }

  viewFor(pid) {
    const { comp, n, error } = this.composition();
    const me = this.players.get(pid);
    return {
      serverNow: Date.now(),
      you: pid,
      room: {
        code: this.code,
        hostId: this.hostId,
        isHost: pid === this.hostId,
        capacity: this.capacity(),
        players: [...this.players.values()]
          .sort((a, b) => a.joinedAt - b.joinedAt)
          .map((p) => ({ id: p.id, name: p.name, connected: p.isBot || p.connected, host: p.id === this.hostId, bot: p.isBot || undefined })),
        settings: this.settings,
        preview: { comp, n, error },
        voice: {
          configured: !!this.voice.apiKey,
          voiceId: this.voice.voiceId,
          model: this.voice.model,
          error: pid === this.hostId ? this.voice.error : null,
        },
        myName: me?.name,
      },
      game: this.game ? this.game.viewFor(pid) : null,
    };
  }

  // ── Narration ──────────────────────────────────────────────
  /** Le sous-titre est immédiat ; un audio tardif ne rattrape jamais une phase passée. */
  narrate(text, { only = null } = {}) {
    const duration = narrationDuration(text);
    const seq = ++this.narrationSeq;
    const scope = narrationScope(this.game);
    const payload = { seq, text, audio: null, at: Date.now(), duration, scope, pendingAudio: !!this.voice.apiKey };
    const send = (value) => {
      if (only) this.io.to(only).emit('narrate', value);
      else this.io.to(this.code).emit('narrate', value);
    };
    send(payload);
    if (!this.voice.apiKey) return duration;
    const voice = { ...this.voice };
    const current = () => seq === this.narrationSeq && scope === narrationScope(this.game);
    this.narrationChain = this.narrationChain.catch(() => {}).then(async () => {
      if (!current()) return;
      try {
        const id = await synthesize(voice, text);
        if (!current()) return;
        send({ ...payload, audio: `/tts/${id}.mp3`, pendingAudio: false, update: true });
        if (this.voice.error) { this.voice.error = null; this.emitState(); }
      } catch (e) {
        if (!current()) return;
        send({ ...payload, pendingAudio: false, update: true });
        this.voice.error = e.message;
        this.emitState();
      }
    });
    return duration;
  }

  prewarmVoice() {
    if (!this.voice.apiKey) return;
    const v = { ...this.voice };
    const sleeps = Object.values(SLEEP_LINES);
    (async () => {
      for (const line of [...PREWARM.map((k) => LINES[k]), ...sleeps]) {
        if (!this.voice.apiKey) return;
        try { await synthesize(v, line); } catch { return; }
      }
    })();
  }

  setVoice({ apiKey, voiceId, model }) {
    if (apiKey !== undefined) this.voice.apiKey = (typeof apiKey === 'string' && apiKey.trim()) || null;
    if (typeof voiceId === 'string' && /^[A-Za-z0-9]{8,40}$/.test(voiceId.trim())) this.voice.voiceId = voiceId.trim();
    if (typeof model === 'string' && /^[a-z0-9_]{3,40}$/.test(model)) this.voice.model = model;
    this.voice.error = null;
    if (this.voice.apiKey) generateMissingSfx(this.voice.apiKey, () => this.io.to(this.code).emit('sfx:update'));
    this.emitState();
  }

  // ── Chat ───────────────────────────────────────────────────
  canRead(pid, ch) {
    const g = this.game;
    if (!g || g.phase === 'over') return ch === 'village';
    const inGame = g.inGame(pid);
    switch (ch) {
      case 'village': return true;
      case 'loups': return g.isGod(pid) || (inGame && g.isWolf(pid));
      case 'morts': return (inGame && !g.isAlive(pid)) || (!inGame && this.isHost(pid));
      case 'amoureux': return !!g.lovers && (g.lovers.includes(pid) || g.isGod(pid));
      default: return false;
    }
  }

  canWrite(pid, ch) {
    const g = this.game;
    if (!g || g.phase === 'over') return ch === 'village';
    const inGame = g.inGame(pid);
    const alive = inGame && g.isAlive(pid);
    switch (ch) {
      case 'village': return (alive || (!inGame && this.isHost(pid))) && !['night', 'reveal'].includes(g.phase);
      case 'loups': return alive && g.isWolf(pid) && g.phase === 'night';
      case 'morts': return (inGame && !alive) || (!inGame && this.isHost(pid));
      case 'amoureux': return alive && !!g.lovers?.includes(pid);
      default: return false;
    }
  }

  canSpy(pid) {
    const g = this.game;
    return !!g && g.phase === 'night' && g.spy.active && g.roles[pid] === 'petite_fille' && g.isAlive(pid);
  }

  anonymize(m) { return { ...m, from: null, name: 'Une voix rauque', spy: true }; }

  historyFor(pid) {
    const out = {};
    for (const ch of CHANNELS) {
      if (this.canRead(pid, ch)) out[ch] = this.chats[ch].slice(-80);
    }
    if (!out.loups && this.canSpy(pid)) {
      out.loups = this.chats.loups.filter((m) => m.night === this.game.nightNo).map((m) => this.anonymize(m));
    }
    const writable = CHANNELS.filter((ch) => this.canWrite(pid, ch));
    return { channels: out, writable };
  }

  sendHistory(pid) {
    const p = this.players.get(pid);
    const sock = p?.socketId && this.io.sockets.sockets.get(p.socketId);
    if (sock) sock.emit('chat:history', this.historyFor(pid));
  }

  onSpy(pid) { this.sendHistory(pid); }

  postChat(pid, ch, text) {
    if (!CHANNELS.includes(ch)) return 'Canal inconnu';
    if (!this.canWrite(pid, ch)) return 'Vous ne pouvez pas parler ici pour le moment';
    const p = this.players.get(pid);
    const now = Date.now();
    if (now - p.lastChat < 400) return 'Doucement…';
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!clean) return null;
    p.lastChat = now;
    const host = this.isHost(pid) && this.game && !this.game.inGame(pid);
    const m = { id: ++this.msgSeq, ch, from: pid, name: host ? `${p.name} (meneur)` : p.name, text: clean, at: now, night: this.game?.nightNo ?? 0 };
    const list = this.chats[ch];
    list.push(m);
    if (list.length > 200) list.splice(0, list.length - 200);
    for (const other of this.players.values()) {
      if (!other.connected || !other.socketId) continue;
      const sock = this.io.sockets.sockets.get(other.socketId);
      if (!sock) continue;
      if (this.canRead(other.id, ch)) sock.emit('chat:msg', m);
      else if (ch === 'loups' && this.canSpy(other.id)) sock.emit('chat:msg', this.anonymize(m));
    }
    this.lastActivity = now;
    return null;
  }
}

// Nettoyage des salons abandonnés
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const anyone = [...room.players.values()].some((p) => p.connected);
    if (!anyone && now - room.lastActivity > 30 * 60 * 1000) room.destroy();
  }
}, 5 * 60 * 1000).unref();
