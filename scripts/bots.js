// Bots de test : remplissent un salon et jouent au hasard.
//   node scripts/bots.js <CODE> [nombre=10] [url=http://localhost:3000]
import { io } from 'socket.io-client';

const [code, count = '10', url = 'http://localhost:3000'] = process.argv.slice(2);
if (!code) { console.error('Usage : node scripts/bots.js <CODE> [nombre] [url]'); process.exit(1); }

const NAMES = ['Aldric', 'Bérénice', 'Corentin', 'Dolorès', 'Eudes', 'Florine', 'Gaspard', 'Hortense', 'Isaure', 'Jehan', 'Kléber', 'Léonie', 'Mathurin', 'Nolwenn', 'Octave', 'Pétronille', 'Quentin', 'Rosalie', 'Sidonie', 'Tancrède', 'Ursule', 'Valentin', 'Wilfried', 'Xavière', 'Yvon', 'Zélie', 'Ambroise', 'Blanche', 'Clovis', 'Diane', 'Edmond', 'Fantine', 'Gauvain', 'Héloïse', 'Ignace', 'Joséphine', 'Lancelot', 'Mahaut', 'Norbert', 'Ophélie', 'Perceval', 'Roseline', 'Séraphin', 'Thaïs', 'Ulric', 'Violette', 'Wandrille', 'Yolande', 'Zacharie', 'Aurèle'];
export function runBot(code, name, url, { log = false } = {}) {
  const s = io(url, { transports: ['websocket'] });
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let lastKey = '';
  s.on('connect', () => s.emit('room:join', { code, name }, (r) => r.error && console.error(name, r.error)));
  s.on('state', (st) => {
    const g = st.game;
    if (!g || !g.action) return;
    const a = g.action;
    const key = `${g.phase}:${g.step}:${g.nightNo}:${g.dayNo}:${a.type}:${a.done}:${a.current ?? ''}`;
    if (key === lastKey) return;
    lastKey = key;
    const act = (x) => setTimeout(() => s.emit('game:action', x, (r) => r?.error && log && console.log(name, a.type, r.error)), 200 + Math.random() * 900);
    switch (a.type) {
      case 'ready': if (!a.done) act({ type: 'ready' }); break;
      case 'pick': if (a.targets.length) act({ type: 'x', targets: [...a.targets].sort(() => Math.random() - .5).slice(0, a.count), target: pick(a.targets) }); else act({ target: null }); break;
      case 'infect': act({ infect: Math.random() < .5 }); break;
      case 'hound': act({ choice: pick(['loup', 'village']) }); break;
      case 'wolves': if (!a.current && a.targets.length) act({ type: 'wolf', target: pick(a.targets) }); break;
      case 'spy': if (!a.active && Math.random() < .5) act({ type: 'spy' }); break;
      case 'witch': act({ save: a.life && a.victim && Math.random() < .5, kill: a.death && Math.random() < .3 ? pick(a.targets) : null }); break;
      case 'callVote': if (!a.done) act({ type: 'callVote' }); break;
      case 'vote': if (!a.current && a.targets.length) act({ type: 'vote', target: pick(a.targets) }); break;
    }
  });
  return s;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Math.min(50, Number(count));
  for (let i = 0; i < n; i++) setTimeout(() => runBot(code, NAMES[i % NAMES.length] + (i >= NAMES.length ? i : ''), url), i * 60);
  console.log(`${n} bots rejoignent le village ${code}…`);
}
