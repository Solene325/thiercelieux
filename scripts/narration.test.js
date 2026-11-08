import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { LINES, SLEEP_LINES } from '../server/narration.js';
import { STEP_LABELS } from '../shared/roles.js';
import { narrationDuration, narrationScope } from '../shared/narration.js';

function room() {
  const messages = [];
  return {
    messages, code: 'TEST01', game: { phase: 'reveal', step: null, nightNo: 0, dayNo: 0 },
    voice: { apiKey: null, error: null }, narrationSeq: 0, narrationChain: Promise.resolve(),
    io: { to: () => ({ emit: (event, payload) => messages.push({ event, payload }) }) },
    emitState() {},
  };
}

test('chaque réveil possède une consigne et une annonce de fin', () => {
  for (const step of Object.keys(STEP_LABELS)) {
    assert.equal(typeof LINES[step], 'string', step);
    assert.match(SLEEP_LINES[step], /referm.*les yeux\./, step);
    assert(narrationDuration(LINES[step]) > narrationDuration(SLEEP_LINES[step]));
  }
});

test('le sous-titre est immédiat et porte la durée et la phase courantes', () => {
  const r = room();
  const duration = Room.prototype.narrate.call(r, LINES.intro);
  assert.equal(r.messages.length, 1);
  assert.equal(r.messages[0].payload.text, LINES.intro);
  assert.equal(r.messages[0].payload.duration, duration);
  assert.equal(r.messages[0].payload.scope, narrationScope(r.game));
  assert.equal(r.messages[0].payload.pendingAudio, false);
});

test('une synthèse tardive ne diffuse jamais une ancienne phase', async (t) => {
  const r = room();
  r.voice.apiKey = 'test-only';
  const pending = [];
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => pending.push(resolve)));
  Room.prototype.narrate.call(r, 'Ancienne annonce de test.');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 1);
  r.game = { phase: 'night', step: 'endormissement', nightNo: 1, dayNo: 0 };
  Room.prototype.narrate.call(r, 'Nouvelle annonce de test.');
  assert.equal(r.messages.length, 2, 'les deux sous-titres partent avant la fin de la synthèse');
  pending.shift()(new Response(new Uint8Array([1, 2]), { status: 200 }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 1);
  pending.shift()(new Response(new Uint8Array([3, 4]), { status: 200 }));
  await r.narrationChain;
  const updates = r.messages.filter((m) => m.payload.update);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].payload.seq, 2);
  assert.equal(updates[0].payload.scope, narrationScope(r.game));
  assert.match(updates[0].payload.audio, /^\/tts\/.*\.mp3$/);
});

test('une erreur du fournisseur libère immédiatement le repli navigateur', async (t) => {
  const r = room(); r.voice.apiKey = 'test-only';
  t.mock.method(globalThis, 'fetch', async () => new Response('{"detail":{"message":"indisponible"}}', { status: 503 }));
  Room.prototype.narrate.call(r, 'Annonce de repli de test.');
  await r.narrationChain;
  assert.equal(r.messages.length, 2);
  assert.equal(r.messages[1].payload.pendingAudio, false);
  assert.equal(r.messages[1].payload.update, true);
  assert.equal(r.messages[1].payload.audio, null);
  assert.match(r.voice.error, /503/);
});
