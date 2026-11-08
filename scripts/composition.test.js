import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeComposition, autoComposition, validateComposition, compositionCount } from '../shared/roles.js';
import { Room } from '../server/room.js';

test('le nombre de villageois choisi est respecté sans remplissage automatique', () => {
  const comp = finalizeComposition({ loup: 1, voyante: 1, villageois: 2 }, 6);
  assert.equal(comp.villageois, 2);
  assert.equal(compositionCount(comp), 4);
  assert.match(validateComposition(comp, 6), /4 cartes pour 6 joueurs/);
});
test('zéro villageois est un choix explicite conservé par le serveur', () => {
  const room = { game: null, settings: {}, emitState() {} };
  Room.prototype.updateSettings.call(room, { custom: { loup: 1, villageois: 0, voyante: 1, sorciere: 1, chasseur: 1 } });
  assert.equal(room.settings.custom.villageois, 0);
  const comp = finalizeComposition(room.settings.custom, 4);
  assert.equal(comp.villageois, undefined);
  assert.equal(validateComposition(comp, 4), null);
});
test('les totaux insuffisants et excessifs sont refusés', () => {
  for (const count of [1, 5]) {
    const comp = finalizeComposition({ loup: 1, voyante: 1, villageois: count }, 6);
    assert.match(validateComposition(comp, 6), /cartes pour 6 joueurs/);
  }
  assert.equal(validateComposition(finalizeComposition({ loup: 1, voyante: 1, villageois: 4 }, 6), 6), null);
});
test('une arrivée ne modifie pas le nombre de villageois choisi', () => {
  const custom = { loup: 1, villageois: 3 };
  assert.equal(validateComposition(finalizeComposition(custom, 4), 4), null);
  assert.equal(finalizeComposition(custom, 5).villageois, 3);
  assert.match(validateComposition(finalizeComposition(custom, 5), 5), /4 cartes pour 5 joueurs/);
});
test('les anciennes compositions et le mode automatique conservent leur remplissage', () => {
  assert.equal(finalizeComposition({ loup: 1, voyante: 1 }, 6).villageois, 4);
  for (const n of [4, 6, 20, 50]) assert.equal(compositionCount(autoComposition(n)), n);
});
test('le serveur borne le réglage des villageois entre zéro et cinquante', () => {
  const room = { game: null, settings: {}, emitState() {} };
  Room.prototype.updateSettings.call(room, { custom: { villageois: 100 } });
  assert.equal(room.settings.custom.villageois, 50);
  Room.prototype.updateSettings.call(room, { custom: { villageois: -4 } });
  assert.equal(room.settings.custom.villageois, 0);
});
