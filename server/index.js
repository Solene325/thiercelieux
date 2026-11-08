// ─────────────────────────────────────────────────────────────
//  Serveur HTTP + WebSocket (Socket.IO)
// ─────────────────────────────────────────────────────────────
import express from 'express';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Room, rooms } from './room.js';
import { getAudio, listVoices, synthesize, VOICE_PRESETS, LINES } from './narration.js';
import { availableSfx, sfxDir } from './sfx.js';
import { createInvitation } from './invitation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000, maxHttpBufferSize: 1e5 });

const nm = (p) => path.join(ROOT, 'node_modules', p);
app.use('/vendor/preact', express.static(nm('preact'), { maxAge: '7d' }));
app.use('/vendor/htm', express.static(nm('htm'), { maxAge: '7d' }));
app.use('/shared', express.static(path.join(ROOT, 'shared')));
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

app.get('/tts/:id.mp3', (req, res) => {
  const buf = getAudio(req.params.id);
  if (!buf) return res.status(404).end();
  res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' });
  res.send(buf);
});
// Images de rôles personnalisées : public/img/roles/<role>.(webp|jpg|jpeg|png|avif)
import fs from 'node:fs';
app.get('/api/role-images', (_req, res) => {
  const dir = path.join(ROOT, 'public', 'img', 'roles');
  const map = {};
  try {
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^([a-z_]+)\.(webp|jpe?g|png|avif)$/i);
      if (m) map[m[1]] = `/img/roles/${f}`;
    }
  } catch { /* dossier absent */ }
  res.json(map);
});
app.use('/sfx', express.static(sfxDir, { maxAge: '30d' }));
app.get('/api/sfx', (_req, res) => res.json(availableSfx()));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

// ── Validation ───────────────────────────────────────────────
const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 18);
const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const reply = (cb, payload) => typeof cb === 'function' && cb(payload);

function ctx(socket) {
  const { code, pid } = socket.data || {};
  const room = code && rooms.get(code);
  if (!room || !room.players.has(pid)) return {};
  return { room, pid, isHost: room.hostId === pid };
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name } = {}, cb) => {
    const n = cleanName(name);
    if (!n) return reply(cb, { error: 'Choisissez un nom pour entrer au village' });
    const room = new Room(io, n);
    const host = room.players.get(room.hostId);
    room.attach(host, socket);
    reply(cb, { ok: true, code: room.code, token: host.token, id: host.id });
  });

  socket.on('room:join', ({ code, name, token } = {}, cb) => {
    const room = rooms.get(cleanCode(code));
    if (!room) return reply(cb, { error: 'Aucun village ne porte ce code' });
    if (token) {
      const p = room.byToken(token);
      if (p) {
        room.attach(p, socket);
        return reply(cb, { ok: true, code: room.code, token: p.token, id: p.id, rejoined: true });
      }
    }
    const n = cleanName(name);
    if (!n) return reply(cb, { error: 'Choisissez un nom pour entrer au village' });
    if (room.game) return reply(cb, { error: 'La partie a déjà commencé : les portes du village sont closes' });
    if (room.players.size >= room.capacity()) return reply(cb, { error: `Le village est complet (${room.capacity()} âmes)` });
    if (room.nameTaken(n)) return reply(cb, { error: 'Ce nom est déjà porté par un villageois' });
    const p = room.addPlayer(n);
    room.attach(p, socket);
    reply(cb, { ok: true, code: room.code, token: p.token, id: p.id });
  });

  socket.on('room:leave', (_ = {}, cb) => {
    const { room, pid } = ctx(socket);
    if (!room) return reply(cb, { ok: true });
    socket.leave(room.code);
    socket.data = {};
    if (!room.game || !room.game.inGame(pid)) room.removePlayer(pid);
    else room.detach({ id: room.players.get(pid).socketId, data: { pid } });
    reply(cb, { ok: true });
  });

  socket.on('room:settings', (patch = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Seul le meneur peut modifier les réglages' });
    reply(cb, { error: room.updateSettings(patch) });
  });

  socket.on('room:kick', ({ id } = {}, cb) => {
    const { room, isHost, pid } = ctx(socket);
    if (!isHost || id === pid) return reply(cb, { error: 'Action refusée' });
    if (room.game) return reply(cb, { error: 'Impossible en cours de partie' });
    const p = room.players.get(id);
    if (!p) return reply(cb, { error: 'Joueur introuvable' });
    const s = p.socketId && io.sockets.sockets.get(p.socketId);
    if (s) { s.emit('kicked'); s.leave(room.code); s.data = {}; }
    room.removePlayer(id);
    reply(cb, { ok: true });
  });

  socket.on('room:invite', async ({ origin } = {}, cb) => {
    const { room } = ctx(socket);
    if (!room) return reply(cb, { error: 'Rejoignez un village pour créer une invitation.' });
    try {
      const invitation = await createInvitation(room.code, origin || socket.handshake.headers.origin);
      reply(cb, { ok: true, ...invitation });
    } catch (e) { reply(cb, { error: e.message }); }
  });

  socket.on('room:bots', ({ add, remove } = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Seul le meneur peut inviter des bots' });
    if (remove) return reply(cb, { error: room.removeBots() });
    reply(cb, { error: room.addBots(Math.max(1, Math.min(50, Math.floor(Number(add) || 1)))) });
  });

  socket.on('room:start', (_ = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Seul le meneur peut lancer la partie' });
    reply(cb, { error: room.startGame() });
  });

  socket.on('room:voice', (cfg = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Réservé au meneur' });
    room.setVoice(cfg);
    reply(cb, { ok: true });
  });

  socket.on('voice:test', async ({ text } = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Réservé au meneur' });
    const line = String(text || LINES.nightFalls).slice(0, 300);
    if (!room.voice.apiKey) return reply(cb, { ok: true, audio: null, text: line });
    try {
      const id = await synthesize(room.voice, line);
      room.voice.error = null;
      reply(cb, { ok: true, audio: `/tts/${id}.mp3`, text: line });
    } catch (e) {
      room.voice.error = e.message;
      room.emitState();
      reply(cb, { error: e.message });
    }
  });

  socket.on('voice:list', async (_ = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Réservé au meneur' });
    if (!room.voice.apiKey) return reply(cb, { ok: true, voices: VOICE_PRESETS });
    try { reply(cb, { ok: true, voices: await listVoices(room.voice.apiKey) }); }
    catch (e) { reply(cb, { error: e.message, voices: VOICE_PRESETS }); }
  });

  socket.on('game:action', (action = {}, cb) => {
    const { room, pid } = ctx(socket);
    if (!room?.game) return reply(cb, { error: 'Aucune partie en cours' });
    reply(cb, { error: room.game.act(pid, action) });
  });

  socket.on('game:skip', (_ = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost || !room.game) return reply(cb, { error: 'Réservé au meneur' });
    room.game.skip();
    reply(cb, { ok: true });
  });

  socket.on('game:end', (_ = {}, cb) => {
    const { room, isHost } = ctx(socket);
    if (!isHost) return reply(cb, { error: 'Réservé au meneur' });
    room.endGame();
    reply(cb, { ok: true });
  });

  socket.on('chat:send', ({ ch, text } = {}, cb) => {
    const { room, pid } = ctx(socket);
    if (!room) return reply(cb, { error: 'Hors du village' });
    reply(cb, { error: room.postChat(pid, ch, text) });
  });

  socket.on('disconnect', () => {
    const { room } = ctx(socket);
    if (room) room.detach(socket);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`\n  ✖ Le port ${PORT} est déjà occupé. Essayez : PORT=3100 npm start\n`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('\n  🌕  Les Loups-Garous de Thiercelieux');
  console.log(`  ➜  Local :   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  ➜  Réseau :  http://${ip}:${PORT}   (pour les téléphones)`);
  console.log('');
});
