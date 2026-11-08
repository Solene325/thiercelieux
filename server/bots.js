// ─────────────────────────────────────────────────────────────
//  Bots côté serveur : remplissent un village pour tester une partie
// ─────────────────────────────────────────────────────────────

export const BOT_NAMES = [
  'Aldric', 'Bérénice', 'Corentin', 'Dolorès', 'Eudes', 'Florine', 'Gaspard', 'Hortense', 'Isaure', 'Jehan',
  'Kléber', 'Léonie', 'Mathurin', 'Nolwenn', 'Octave', 'Pétronille', 'Quentin', 'Rosalie', 'Sidonie', 'Tancrède',
  'Ursule', 'Valentin', 'Wilfried', 'Xavière', 'Yvon', 'Zélie', 'Ambroise', 'Blanche', 'Clovis', 'Diane',
  'Edmond', 'Fantine', 'Gauvain', 'Héloïse', 'Ignace', 'Joséphine', 'Lancelot', 'Mahaut', 'Norbert', 'Ophélie',
  'Perceval', 'Roseline', 'Séraphin', 'Thaïs', 'Ulric', 'Violette', 'Wandrille', 'Yolande', 'Zacharie', 'Aurèle',
];

const DAY_LINES = [
  "J'ai entendu des grattements contre ma porte cette nuit…",
  'Quelqu’un a vu où était passé le forgeron hier soir ?',
  'Je ne fais confiance à personne. Surtout pas à {x}.',
  '{x}, tu es bien silencieux aujourd’hui…',
  'Je suis un simple villageois, je le jure sur ma ferme !',
  'Votons vite, avant que la nuit ne retombe.',
  'Il y avait de la boue sur les bottes de {x} ce matin.',
  'Si on se trompe encore, nous sommes perdus.',
  'Je pense que {x} cache quelque chose.',
  'Écoutons la Voyante… si elle est encore parmi nous.',
];
const WOLF_LINES = ['On prend {x} ?', '{x}, ce soir. Personne ne le regrettera.', 'Attention à {x}, il nous soupçonne.', 'Je suis d’accord.'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

/** Décide de l'action d'un bot pour l'action proposée. */
function decide(game, id, a) {
  switch (a.type) {
    case 'ready': return a.done ? null : { type: 'ready' };
    case 'callVote': return a.done || Math.random() < 0.35 ? null : { type: 'callVote' };
    case 'hound': return { choice: Math.random() < 0.4 ? 'loup' : 'village' };
    case 'infect': return { infect: Math.random() < 0.5 };
    case 'spy': return a.active || Math.random() < 0.6 ? null : { type: 'spy' };
    case 'witch': {
      const save = a.life && a.victim && Math.random() < 0.5;
      const kill = a.death && Math.random() < 0.2 ? pick(a.targets.filter((t) => t !== id)) : null;
      return { save, kill: kill || null };
    }
    case 'pick': {
      if (!a.targets.length || a.count === 0) return { target: null };
      if (a.allowSkip && Math.random() < 0.2) return { target: null };
      const t = shuffle(a.targets).slice(0, a.count);
      return a.count === 2 ? { targets: t } : { target: t[0] };
    }
    case 'wolves': {
      if (a.current) return null;
      // La meute se range derrière la cible déjà la plus votée
      const tally = {};
      for (const t of Object.values(game.wolfVotes)) if (a.targets.includes(t)) tally[t] = (tally[t] || 0) + 1;
      const best = Object.entries(tally).sort((x, y) => y[1] - x[1])[0];
      return { type: 'wolf', target: best && Math.random() < 0.8 ? best[0] : pick(a.targets) };
    }
    case 'vote': {
      if (a.current && Math.random() < 0.85) return null;
      // Effet de foule : on suit souvent le plus accusé
      const tally = game.tally();
      const best = Object.entries(tally).filter(([t]) => a.targets.includes(t)).sort((x, y) => y[1] - x[1])[0];
      const target = best && Math.random() < 0.55 ? best[0] : pick(a.targets);
      return target === a.current ? null : { type: 'vote', target };
    }
    default: return null;
  }
}

/** Fait jouer les bots du salon. Appelé après chaque diffusion d'état. */
export function driveBots(room) {
  const game = room.game;
  if (!game) return;
  for (const p of room.players.values()) {
    if (!p.isBot || !game.inGame(p.id)) continue;
    const a = game.actionFor(p.id);
    const key = a ? `${game.phase}:${game.step}:${game.nightNo}:${game.dayNo}:${a.type}:${a.done ?? ''}:${a.current ?? ''}:${a.active ?? ''}` : null;
    if (key === p.botKey) continue;
    p.botKey = key;
    if (a) {
      const delay = (a.type === 'ready' ? 600 : 1200) + Math.random() * (a.type === 'vote' || a.type === 'callVote' ? 9000 : 3500);
      setTimeout(() => {
        if (room.game !== game || game.phase === 'destroyed') return;
        const fresh = game.actionFor(p.id);
        if (!fresh || fresh.type !== a.type) return;
        const d = decide(game, p.id, fresh);
        if (d) game.act(p.id, d);
        p.botKey = null; // ré-évaluer (ex. vote modifiable)
      }, delay);
    }
    maybeChat(room, game, p);
  }
}

function maybeChat(room, game, p) {
  const k = `${game.phase}:${game.dayNo}:${game.nightNo}`;
  if (p.chatKey === k) return;
  p.chatKey = k;
  const others = game.aliveIds().filter((x) => x !== p.id);
  if (!others.length || !game.isAlive(p.id)) return;
  let ch = null;
  let lines = null;
  if (game.phase === 'day' && Math.random() < 0.3) { ch = 'village'; lines = DAY_LINES; }
  else if (game.phase === 'night' && game.step === 'loups' && game.isWolf(p.id) && Math.random() < 0.4) { ch = 'loups'; lines = WOLF_LINES; }
  if (!ch) return;
  setTimeout(() => {
    if (room.game !== game) return;
    p.lastChat = 0;
    room.postChat(p.id, ch, pick(lines).replace('{x}', room.nameOf(pick(others))));
  }, 2000 + Math.random() * 15000);
}
