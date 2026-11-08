import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationLink, createInvitation } from '../server/invitation.js';

test('le lien public ouvre directement le bon village', () => {
  assert.equal(invitationLink('AB12CD', 'https://jeu.example/ancienne-page?test=1', []), 'https://jeu.example/?code=AB12CD');
});
test('localhost est remplacé par l’adresse réseau en conservant le port', () => {
  for (const origin of ['http://localhost:3100', 'http://127.0.0.1:3100', 'http://[::1]:3100']) {
    assert.equal(invitationLink('AB12CD', origin, ['192.168.1.20']), 'http://192.168.1.20:3100/?code=AB12CD');
  }
});
test('une adresse publique reste inchangée sur un serveur disposant d’un réseau privé', () => {
  assert.equal(invitationLink('AB12CD', 'https://jeu.example', ['192.168.1.20']), 'https://jeu.example/?code=AB12CD');
});
test('les adresses non web, les identifiants et les codes invalides sont rejetés', () => {
  for (const origin of ['javascript:alert(1)', 'file:///tmp/test', 'https://nom:secret@jeu.example', 'pas-une-adresse', null]) {
    assert.throws(() => invitationLink('AB12CD', origin, []));
  }
  for (const code of ['abc123', 'AB12C', 'AB12CD7', '<svg/>']) assert.throws(() => invitationLink(code, 'https://jeu.example', []));
});
test('un QR SVG autonome est généré avec son lien d’invitation', async () => {
  const { link, svg } = await createInvitation('AB12CD', 'https://jeu.example');
  assert.equal(link, 'https://jeu.example/?code=AB12CD');
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox=/);
  assert.match(svg, /#ffffff/);
  assert.doesNotMatch(svg, /<script|<image/);
});
