// Simulation de bout en bout : un meneur + N bots jouent des parties complètes.
//   GAME_SPEED_FACTOR=0.05 npm start   puis   node scripts/simulate.js [joueurs...]
import { io } from 'socket.io-client';
import { runBot } from './bots.js';

const url = process.env.URL || 'http://localhost:3000';
const sizes = process.argv.slice(2).map(Number).filter(Boolean);
const NAMES = 'Aldric Bérénice Corentin Dolorès Eudes Florine Gaspard Hortense Isaure Jehan Kléber Léonie Mathurin Nolwenn Octave Pétronille Quentin Rosalie Sidonie Tancrède Ursule Valentin Wilfried Xavière Yvon Zélie Ambroise Blanche Clovis Diane Edmond Fantine Gauvain Héloïse Ignace Joséphine Lancelot Mahaut Norbert Ophélie Perceval Roseline Séraphin Thaïs Ulric Violette Wandrille Yolande Zacharie Aurèle'.split(' ');

function playOnce(n) {
  return new Promise((resolve, reject) => {
    const host = io(url, { transports: ['websocket'] });
    const bots = [];
    const phases = [];
    let started = false;
    const to = setTimeout(() => reject(new Error(`Timeout (${n} joueurs) — phases: ${phases.slice(-12).join(' > ')}`)), 600000);
    host.emit('room:create', { name: 'Meneur' }, (r) => {
      if (r.error) return reject(new Error(r.error));
      host.emit('room:settings', { hostPlays: false });
      for (let i = 0; i < n; i++) bots.push(runBot(r.code, NAMES[i], url, { log: false }));
    });
    host.on('state', (st) => {
      const players = st.room.players.length - 1;
      if (!started && players === n && st.room.preview.n === n) {
        started = true;
        host.emit('room:start', {}, (r) => r.error && reject(new Error(r.error)));
      }
      const g = st.game;
      if (!g) return;
      const tag = `${g.phase}${g.step ? ':' + g.step : ''}`;
      if (phases[phases.length - 1] !== tag) phases.push(tag);
      if (g.phase === 'over') {
        clearTimeout(to);
        const alive = g.players.filter((p) => p.alive).length;
        console.log(`✔ ${String(n).padStart(2)} joueurs — ${g.winner.title.padEnd(26)} nuits:${g.nightNo} jours:${g.dayNo} survivants:${alive}  compo:${JSON.stringify(g.composition)}`);
        bots.forEach((b) => b.close());
        host.close();
        resolve();
      }
    });
  });
}

for (const n of sizes.length ? sizes : [4, 6, 8, 12, 16, 20, 30, 50]) await playOnce(n);
process.exit(0);
