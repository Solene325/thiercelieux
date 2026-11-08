// ─────────────────────────────────────────────────────────────
//  Direction artistique « gravure » : cartes de tarot à l'encre,
//  silhouettes détaillées, hachures, lune gravée, arbres morts.
//  Tout est vectoriel. Une image peut remplacer n'importe quelle
//  illustration : déposez public/img/roles/<role>.(webp|jpg|png).
// ─────────────────────────────────────────────────────────────
import { ROLES } from '/shared/roles.js';

let uidSeq = 0;
const uid = () => `g${(++uidSeq).toString(36)}`;

const INK = '#07080c';
const BONE = '#e9dfc6';
const GOLD = '#c9a74a';
const BLOOD = '#c2302f';
const AMBER = '#f0b65a';

const TONES = {
  village: { sky: ['#1b2238', '#0d1020', '#07080d'], hill: '#10131f', accent: GOLD },
  loups: { sky: ['#2a0b10', '#14070b', '#07060a'], hill: '#150a0d', accent: '#b8463c' },
  solo: { sky: ['#1f2838', '#111622', '#07080d'], hill: '#121722', accent: '#b7c4d6' },
};

// ── Générateurs procéduraux ──────────────────────────────────
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Arbre mort : branches récursives effilées. */
function deadTree(x, y, h, seed, { lean = 0, color = INK, w = 3.2 } = {}) {
  const r = rng(seed);
  let out = '';
  const branch = (x1, y1, ang, len, width, depth) => {
    const x2 = x1 + Math.cos(ang) * len;
    const y2 = y1 + Math.sin(ang) * len;
    const cx = (x1 + x2) / 2 + (r() - 0.5) * len * 0.25;
    const cy = (y1 + y2) / 2 + (r() - 0.5) * len * 0.25;
    out += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="${width.toFixed(2)}"/>`;
    if (depth <= 0 || width < 0.35) return;
    const n = depth > 3 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const spread = 0.35 + r() * 0.5;
      const a = ang + (i === 0 ? -spread : i === 1 ? spread : (r() - 0.5) * 0.4);
      branch(x2, y2, a, len * (0.62 + r() * 0.18), width * 0.62, depth - 1);
    }
  };
  branch(x, y, -Math.PI / 2 + lean, h * 0.36, w, 6);
  return `<g fill="none" stroke="${color}" stroke-linecap="round">${out}</g>`;
}

/** Sapin à branches tombantes (bords dentelés, pas de triangles). */
function pine(x, y, h, r) {
  const w = h * (0.26 + r() * 0.08);
  const steps = 9 + Math.floor(r() * 4);
  let right = '';
  let left = '';
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const yy = y - h + h * t * 0.94;
    const ww = w * Math.pow(t, 0.9) * (0.85 + r() * 0.3);
    const tip = yy + h * 0.035;
    right += `L${(x + ww).toFixed(1)} ${tip.toFixed(1)} L${(x + ww * 0.3).toFixed(1)} ${(yy + h * 0.012).toFixed(1)} `;
    left = `L${(x - ww * 0.3).toFixed(1)} ${(yy + h * 0.012).toFixed(1)} L${(x - ww).toFixed(1)} ${tip.toFixed(1)} ` + left;
  }
  return `M${x.toFixed(1)} ${(y - h).toFixed(1)} ${right}L${(x + 1.2).toFixed(1)} ${y} L${(x - 1.2).toFixed(1)} ${y} ${left}Z `;
}

function forest(seed, { y, minH, maxH, gap, W, x0 = -20 }) {
  const r = rng(seed);
  let d = '';
  for (let x = x0; x < W + 20; x += gap * (0.45 + r())) d += pine(x, y + r() * 6, minH + r() * (maxH - minH), r);
  return d;
}

// ── Sujets (repère local 100×100, sol vers y = 92) ───────────
const WOLF = 'M84 80 C86 70 87 62 84 54 C82 48 79 44 76 40 C74 36 72 32 70 28 L71 22 L74 14 L68.5 18.5 L66 12 L62.5 18.5 L57 17 L47 10 L48.5 13 L55.5 19.5 L50 17.5 L57.5 23.5 C60 28 61 33 62 38 C62.5 44 61.5 50 62 56 L60 80 L64.5 80 L66 63 L69.5 66 C72 72 75.5 78 78 80 Z';
const WOLF_TAIL = 'M84 78 C91 80 95.5 76 98 70 C99 78 94 84 84 82.5 Z';
const ROBE = 'M50 22 C42 22 38 29 38 36 C34 42 31 52 29 64 L26 92 L74 92 L71 64 C69 52 66 42 62 36 C62 29 58 22 50 22 Z';
const WINGS_L = 'M49 50 C41 39 27 33 6 33 C12 37 16 39 19 41.5 C12.5 41.5 8.5 44 4 48.5 C12 48 18.5 49 23 50.5 C16.5 52.5 12.5 55.5 10 60 C18.5 58 26.5 57 33 57 C29 60.5 27 64 27 68 C35.5 63 41.5 59 48.5 56.5 Z';
const WING_FEATHERS = '<path d="M46 50 C36 42 24 38 10 37 M44 53 C34 48 24 47 12 49 M42 55.5 C34 54 26 55 16 58" fill="none" stroke="#e9dfc6" stroke-opacity=".28" stroke-width=".5"/>';

const ground = (ink, y = 92) => `<path d="M-12 ${y} C10 ${y - 3} 26 ${y - 1} 44 ${y - 2.5} C62 ${y - 4} 80 ${y - 1} 112 ${y - 3} V112 H-12 Z" fill="${ink}"/>`;
const grass = (seed, y = 91) => {
  const r = rng(seed);
  let d = '';
  for (let x = -6; x < 106; x += 1.6 + r() * 2.2) d += `M${x.toFixed(1)} ${y} l${(r() * 1.6 - 0.8).toFixed(1)} -${(1.5 + r() * 3).toFixed(1)} `;
  return `<path d="${d}" stroke="${INK}" stroke-width=".7" fill="none"/>`;
};
const GLOWS = { [AMBER]: 'amber', [BLOOD]: 'blood', '#b9a3ff': 'violet', '#9fd98a': 'green', '#ffe9a8': 'holy' };
const glow = (cx, cy, r, color, id, o = 0.55) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glow-${GLOWS[color] || 'amber'}-${id})" opacity="${o}"/>`;
const MOON_TINTS = { bone: ['#fbf4df', '#e2cf9f', '#8f7643'], blood: ['#f2b2a0', '#b13a2c', '#4a0f0c'], pale: ['#f4f7fb', '#b9c6d8', '#5c6a80'] };
const eyes = (pairs) => pairs.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry=".55" fill="${BLOOD}"/><ellipse cx="${x + 3}" cy="${y}" rx="1.1" ry=".55" fill="${BLOOD}"/>`).join('');

/**
 * Chaque rôle : { moon: [x, y, r, teinte], trees: [...], draw(p) }
 *  - coordonnées de la lune et des arbres dans le repère de la carte (200×300, fenêtre 24..176 × 34..238)
 *  - draw() dessine dans le repère local 100×100
 */
// Couleur de l'aura qui rétro-éclaire chaque personnage
const AURA = {
  loup: '#d8443a', loup_blanc: '#9fd2ff', villageois: '#f0b65a', voyante: '#b9a3ff', sorciere: '#9fd98a', chasseur: '#e0a060',
  cupidon: '#ff8fa8', petite_fille: '#f0b65a', chien_loup: '#d8443a', salvateur: '#9fd2ff', ancien: '#e9dfc6', idiot: '#e7c95a',
  corbeau: '#b9a3ff', renard: '#f08a3a', montreur_ours: '#e0a060', grand_mechant_loup: '#ff3b2f', infect: '#9fd98a',
  enfant_sauvage: '#9fd98a', bouc: '#d8443a', joueur_flute: '#d48bff', chevalier: '#cfd8e6', ange: '#fff2c0', soeur: '#ff8fa8', pretre: '#ffe9a8',
};

const SUBJECTS = {
  loup: {
    moon: [86, 98, 40, 'bone'], trees: [[30, 236, 120, 11, -0.15]],
    draw: (p) => `
      <path d="M38 100 L45 85 L53 81 L61 78.5 L71 80.5 L81 76 L92 82 L104 100 Z" fill="${p.ink}"/>
      <path d="M53 81 L57 88 M71 80.5 L68 90 M81 76 L86 86" stroke="${BONE}" stroke-opacity=".18" stroke-width=".5" fill="none"/>
      <path d="${WOLF}" fill="${p.ink}" class="rim"/><path d="${WOLF_TAIL}" fill="${p.ink}" class="rim"/>
      <path d="M70 28 C72 34 76 40 80 46 M62 40 C63 46 63 52 63 56" stroke="${BONE}" stroke-opacity=".22" stroke-width=".45" fill="none"/>
      <ellipse cx="59.5" cy="20.5" rx="1.2" ry=".6" fill="${BLOOD}" transform="rotate(-30 59.5 20.5)"/>`,
  },
  loup_blanc: {
    moon: [112, 96, 36, 'blood'], trees: [[176, 236, 110, 21, 0.2]],
    draw: (p) => `
      <path d="M-12 86 C20 82 50 86 112 82 V112 H-12 Z" fill="#c9cdd6" opacity=".9"/>
      <path d="M-12 86 C20 82 50 86 112 82" stroke="${INK}" stroke-width=".5" fill="none"/>
      <g transform="translate(-14 4)"><path d="${WOLF}" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".7"/><path d="${WOLF_TAIL}" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".7"/>
      <path d="M70 28 C72 34 76 40 80 46 M62 40 C63 46 63 52 63 56 M66 62 C70 66 74 72 78 78" stroke="${INK}" stroke-opacity=".5" stroke-width=".45" fill="none"/>
      <ellipse cx="59.5" cy="20.5" rx="1.3" ry=".7" fill="#7fd0ff" transform="rotate(-30 59.5 20.5)"/></g>`,
  },
  villageois: {
    moon: [138, 84, 22, 'bone'], trees: [[178, 238, 120, 31, 0.1]],
    draw: (p) => `
      <path d="M2 92 V62 L19 47 L36 62 V92 Z" fill="${p.ink}" class="rim"/>
      <path d="M-1 63 L19 45 L39 63" stroke="${INK}" stroke-width="3" fill="none"/>
      <path d="M27 54 V44 H32 V58" fill="${p.ink}"/>
      <rect x="12" y="68" width="8" height="7" fill="${AMBER}"/>${glow(16, 71.5, 14, AMBER, p.id, 0.5)}
      <path d="M16 68 V75 M12 71.5 H20" stroke="${INK}" stroke-width=".9"/>
      <path d="M26 92 V78 H33 V92" fill="#030305"/>
      <ellipse cx="58" cy="38" rx="4.6" ry="5.3" fill="${p.ink}"/>
      <path d="M49.5 35.6 Q58 31 66.5 35.6 L64.5 37 Q58 33.6 51.5 37 Z M53.8 34.6 Q54.6 27.5 58 27.5 Q61.4 27.5 62.2 34.6 Z" fill="${p.ink}" class="rim"/>
      <path d="M53.5 43 C50 44 48 47 47 52 L45 66 C44 72 45 76 46 80 L48 92 L54 92 L56 76 L59.5 76 L61 92 L67 92 L68 78 C69 72 69 66 68 60 L67 50 C66 46 64 44 62.5 43 Z" fill="${p.ink}" class="rim"/>
      <path d="M66 50 L72.5 57 L74.5 55 L68 48 Z" fill="${p.ink}"/>
      <path d="M73 96 L78.5 22" stroke="${INK}" stroke-width="1.6"/>
      <path d="M73.3 25 Q78.5 28 83.6 24.6 M73.3 25 L73.6 12 M78.4 26.4 L79 10.6 M83.6 24.6 L84.4 12" stroke="${INK}" stroke-width="1.1" fill="none"/>`,
  },
  voyante: {
    moon: [100, 82, 30, 'bone'], trees: [[30, 238, 100, 41, -0.1], [172, 238, 96, 42, 0.12]],
    draw: (p) => `
      <path d="${ROBE}" transform="translate(0 -6)" fill="${p.ink}" class="rim"/>
      <ellipse cx="50" cy="32" rx="6.4" ry="8" fill="#000"/>
      <ellipse cx="47.8" cy="32.5" rx=".9" ry=".5" fill="${BONE}" opacity=".7"/><ellipse cx="52.2" cy="32.5" rx=".9" ry=".5" fill="${BONE}" opacity=".7"/>
      <path d="M46 16 C48 24 49 30 50 40 M54 16 C52 24 51 30 50 40" stroke="${BONE}" stroke-opacity=".12" stroke-width=".5" fill="none"/>
      ${glow(50, 69, 26, '#b9a3ff', p.id, 0.7)}
      <circle cx="50" cy="69" r="10" fill="url(#orb-${p.id})" stroke="${BONE}" stroke-opacity=".5" stroke-width=".5"/>
      <path d="M44 66 Q50 61.5 56 66 Q50 70.5 44 66 Z" fill="none" stroke="${BONE}" stroke-width=".5" opacity=".8"/><circle cx="50" cy="66" r="1.6" fill="${BONE}" opacity=".85"/>
      <path d="M45 64 A6 6 0 0 1 49 61" stroke="#fff" stroke-opacity=".6" stroke-width=".6" fill="none"/>
      <path d="M37.5 72 Q40 64 44.5 65.5 L43 75 Z M62.5 72 Q60 64 55.5 65.5 L57 75 Z" fill="${p.ink}"/>
      <path d="M43 79.5 L57 79.5 L55 76.5 L45 76.5 Z" fill="${p.ink}" class="rim"/>
      <path d="M14 80 H86 V84.5 H14 Z" fill="${p.ink}" class="rim"/><path d="M20 84.5 V96 M80 84.5 V96" stroke="${INK}" stroke-width="2.2"/>
      <rect x="21" y="71" width="2.6" height="9" fill="${BONE}" opacity=".85"/><rect x="76.4" y="73" width="2.6" height="7" fill="${BONE}" opacity=".85"/>
      <path d="M22.3 71 q-1.3 -2.5 0 -4.8 q1.3 2.3 0 4.8 Z M77.7 73 q-1.3 -2.5 0 -4.8 q1.3 2.3 0 4.8 Z" fill="${AMBER}"/>
      ${glow(22.3, 68, 7, AMBER, p.id, 0.6)}${glow(77.7, 70, 7, AMBER, p.id, 0.6)}`,
  },
  sorciere: {
    moon: [134, 80, 26, 'bone'], trees: [[30, 236, 116, 51, -0.2]],
    draw: (p) => `
      <path d="M70 66 C66 58 74 54 70 46 C66 40 72 36 70 28" stroke="${BONE}" stroke-opacity=".35" stroke-width=".7" fill="none"/>
      <path d="M76 64 C80 56 72 52 77 44 C80 38 76 34 78 30" stroke="${BONE}" stroke-opacity=".25" stroke-width=".6" fill="none"/>
      ${glow(72, 74, 20, '#9fd98a', p.id, 0.45)}
      <path d="M28 29.5 Q42 25 56 30 Q44 32.5 28 29.5 Z" fill="${p.ink}" class="rim"/>
      <path d="M35.5 29 L42 9 L44 4 L48.5 9.5 L46 12 L46.5 29 Z" fill="${p.ink}" class="rim"/>
      <path d="M36.5 30 C35.5 36 37.5 42 41 44.5 L47 42.5 C49 38 48.4 33 46.4 30 Z" fill="${p.ink}"/>
      <path d="M36.5 30 C34 38 33 46 30 52" stroke="${INK}" stroke-width="1.4" fill="none"/>
      <path d="M38 42 C33 48 31 58 30 70 L27 92 L56 92 L52.5 70 C51.5 60 50.5 50 47.5 43 Z" fill="${p.ink}" class="rim"/>
      <path d="M47 50 L60 53 L60.4 56.2 L46.2 55.4 Z" fill="${p.ink}"/>
      <path d="M59.5 50.6 L64 47 L66 49.6 L61.6 53.4 Z" fill="${BONE}" opacity=".75"/><path d="M64.6 48.5 L66.4 47" stroke="${BONE}" stroke-width=".8"/>
      <path d="M65.6 50.2 q.6 3 0 5.4 M66.4 57.8 q.3 1.3 0 2.4" stroke="#9fd98a" stroke-width=".7" fill="none"/>
      <path d="M57.5 72 C55.5 86 65.5 92.5 72 92.5 C78.5 92.5 88.5 86 86.5 72 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="72" cy="72" rx="15.2" ry="3.6" fill="#0b1209" stroke="${BONE}" stroke-opacity=".4" stroke-width=".5"/>
      <ellipse cx="72" cy="72" rx="12" ry="2.2" fill="#8fbf74" opacity=".5"/>
      <path d="M62 93 q2 -5 4 -1 q1 -4 3 0 q2 -6 4 -1 q2 -4 3.5 0 q2 -5 3.5 1" fill="#c96a2a" opacity=".55"/>`,
  },
  chasseur: {
    moon: [62, 92, 26, 'bone'], trees: [[176, 236, 124, 61, 0.15], [36, 238, 80, 62, -0.1]],
    draw: (p) => `
      <ellipse cx="52" cy="30" rx="4.8" ry="5.4" fill="${p.ink}"/>
      <path d="M43.5 27.4 H61.5 L60.4 29.4 H44.6 Z M47 27.4 Q48 19.6 53 19.6 Q58 19.6 58 27.4 Z" fill="${p.ink}" class="rim"/>
      <path d="M57.5 22 C64 16 69 12.5 74 11 C69 16 64 20.5 59 24.5 Z" fill="${p.ink}"/>
      <path d="M58.5 22.6 C64 17.6 68 14.4 72.6 12.4" stroke="${BONE}" stroke-opacity=".35" stroke-width=".4" fill="none"/>
      <path d="M47 35 C43 37 41 42 40 50 L38 70 L34.5 92 L44 92 L47 74 L52.5 74 L55.5 92 L64.5 92 L62 70 L61 50 C60 42 58 37 55 35 Z" fill="${p.ink}" class="rim"/>
      <path d="M44 48 L46 70 M58 48 L57 68" stroke="${BONE}" stroke-opacity=".14" stroke-width=".5"/>
      <path d="M58.5 47.5 L79 7.5" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M79 7.5 L80.6 4.4" stroke="${BONE}" stroke-opacity=".5" stroke-width="1"/>
      <path d="M54 50.5 L60.5 54.5 L57.5 59 L51 55 Z" fill="${p.ink}" class="rim"/>
      <path d="M40 44 L36 58 L39 58.5 L42.5 46 Z" fill="${p.ink}"/>
      <path d="M36.5 58 C34 62 33 66 34 70 C36 68 38 64 39.5 60 Z" fill="${p.ink}"/>`,
  },
  cupidon: {
    moon: [100, 104, 44, 'bone'], trees: [],
    draw: (p) => `
      <g class="rim">
        <path d="${WINGS_L}" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".5"/>
        <path d="${WINGS_L}" transform="translate(100 0) scale(-1 1)" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".5"/>
      </g>
      ${WING_FEATHERS.replaceAll('#e9dfc6', INK)}<g transform="translate(100 0) scale(-1 1)">${WING_FEATHERS.replaceAll('#e9dfc6', INK)}</g>
      <path d="M22 70 Q50 38 78 70" stroke="${INK}" stroke-width="2.4" fill="none"/>
      <path d="M22 70 L50 58 L78 70" stroke="${BONE}" stroke-opacity=".6" stroke-width=".45" fill="none"/>
      <path d="M50 92 L50 14" stroke="${INK}" stroke-width="1.6"/>
      <path d="M50 8 L46.4 17 L50 15 L53.6 17 Z" fill="${INK}" stroke="${BONE}" stroke-opacity=".5" stroke-width=".4"/>
      <path d="M50 92 L46 84 L46 88 Z M50 92 L54 84 L54 88 Z M50 87 L46 79 L46 83 Z M50 87 L54 79 L54 83 Z" fill="${INK}"/>
      <path d="M50 52 C45 46 39 48 40 53 C41 58 50 62 50 64 C50 62 59 58 60 53 C61 48 55 46 50 52 Z" fill="none" stroke="${BLOOD}" stroke-width="1"/>`,
  },
  petite_fille: {
    moon: [100, 78, 22, 'bone'], trees: [[34, 238, 150, 71, -0.05], [168, 238, 150, 72, 0.06], [64, 214, 70, 73, -0.25]],
    draw: (p) => `
      ${eyes([[10, 52], [80, 44], [88, 60]])}
      ${glow(64, 76, 22, AMBER, p.id, 0.55)}
      <path d="M44 50 C38 50 35 55 35 60 C32 66 30.5 76 28.5 92 L60 92 C58.5 76 56.5 66 53.5 60 C53.5 55 50 50 44 50 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="44.6" cy="59" rx="3.4" ry="4.4" fill="#000"/>
      <path d="M44 50 C41 56 40 62 40 68 M44 50 C47 56 48 62 48 68" stroke="${BONE}" stroke-opacity=".14" stroke-width=".45" fill="none"/>
      <path d="M52.5 66 L62 70 L62 72.4 L52 69.2 Z" fill="${p.ink}"/>
      <path d="M63 70.6 V73.8" stroke="${INK}" stroke-width=".8"/>
      <path d="M60.6 74 H65.4 L66 76 V81 L65 82.4 H61 L60 81 V76 Z" fill="${AMBER}" stroke="${INK}" stroke-width=".8"/>
      <path d="M63 74 V82.4 M60.2 78 H65.8" stroke="${INK}" stroke-width=".5"/>`,
  },
  chien_loup: {
    moon: [146, 82, 22, 'blood'], trees: [[30, 238, 100, 81, -0.1]],
    draw: (p) => `
      <g transform="translate(116 -6) scale(-1.05 1.05)" opacity=".85"><path d="${WOLF}" fill="#2a0c10" stroke="${BLOOD}" stroke-width=".7" stroke-opacity=".8"/><path d="${WOLF_TAIL}" fill="#2a0c10" stroke="${BLOOD}" stroke-width=".7" stroke-opacity=".8"/>
        <ellipse cx="59.5" cy="20.5" rx="1.3" ry=".7" fill="${BLOOD}" transform="rotate(-30 59.5 20.5)"/></g>
      <path d="M30 92 C28 84 28 77 31.5 71 C34 66.5 36 61.5 37.6 56 L39.4 46.4 C39.8 42 41.6 38.6 45 36.6 L46.8 30.6 L49.4 35.6 L50.6 30 L53 35.6 C57.4 35.8 61.6 38.4 63.8 40.6 L66.4 41.8 L64.6 44.6 L58.2 44.4 C56 46.6 54.2 50.6 53 55 C52.6 61 54.4 70 56.4 80 L58.4 92 L52.4 92 L50.4 80.6 L46.2 76.8 C44.2 82.4 44.4 88 46 92 Z" fill="${p.ink}" class="rim"/>
      <path d="M30.5 90 C24 92.4 18 90.4 13.6 86 C19.6 88 25.6 88 30 85.6 Z" fill="${p.ink}"/>
      <ellipse cx="53.6" cy="38.6" rx=".9" ry=".55" fill="${BONE}" opacity=".7"/>
      <path d="M44 44 C46 52 47 60 48 70" stroke="${BONE}" stroke-opacity=".14" stroke-width=".5" fill="none"/>`,
  },
  salvateur: {
    moon: [100, 80, 24, 'bone'], trees: [[30, 238, 90, 91, -0.2], [172, 238, 96, 92, 0.2]],
    draw: (p) => `
      <path d="M50 20 C44 20 41 25 41 30 C38 34 36 38 33 46 L67 46 C64 38 62 34 59 30 C59 25 56 20 50 20 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="50" cy="30" rx="4.6" ry="5.8" fill="#000"/>
      <path d="M33 46 C30 56 29 72 28 92 L72 92 C71 72 70 56 67 46 Z" fill="${p.ink}"/>
      <path d="M79 96 L79 30" stroke="${INK}" stroke-width="1.6"/>
      <path d="M79 30 Q84 30 84 26" stroke="${INK}" stroke-width="1.2" fill="none"/>
      ${glow(84, 32, 18, AMBER, p.id, 0.55)}
      <path d="M82 28.6 H86 L86.6 30.4 V35 L85.8 36.2 H82.2 L81.4 35 V30.4 Z" fill="${AMBER}" stroke="${INK}" stroke-width=".7"/>
      <path d="M50 40 L73 46.5 V64 C73 78 63 88 50 95 C37 88 27 78 27 64 V46.5 Z" fill="${p.ink}" stroke="${BONE}" stroke-opacity=".55" stroke-width=".7"/>
      <path d="M50 44.6 L69.4 50 V64 C69.4 75.6 61 84 50 90.2 C39 84 30.6 75.6 30.6 64 V50 Z" fill="none" stroke="${GOLD}" stroke-opacity=".7" stroke-width=".55"/>
      <path d="M56 56 A11 11 0 1 0 56 77 A8.4 8.4 0 1 1 56 56 Z" fill="${BONE}" opacity=".9"/>`,
  },
  ancien: {
    moon: [128, 86, 24, 'bone'], trees: [[172, 238, 130, 101, 0.25]],
    draw: (p) => `
      <path d="M33.2 33 C33.4 25.4 39.6 22.4 44.8 25.8 C47 27.6 47.4 31.6 46.4 35 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="40.4" cy="34" rx="4.8" ry="5.3" fill="${p.ink}"/>
      <path d="M36 36.6 C34.6 44 36.6 52.6 40.2 57 C41.2 50.4 42 44 42 38.4 Z" fill="${BONE}" opacity=".88"/>
      <path d="M37.6 40 C37.6 46 38.6 50 39.8 54 M40 38.6 C40 44 40.6 48 40.8 52" stroke="${INK}" stroke-opacity=".35" stroke-width=".35" fill="none"/>
      <path d="M42 38 C50 38 56.4 43.6 58.4 52 C60.2 60 60.2 70 62 80 L64.4 92 L50 92 L48 80 L44.4 92 L38.2 92 L42 74 C42 64 40.4 54 38.6 46.6 Z" fill="${p.ink}" class="rim"/>
      <path d="M48 46 C52 56 54 68 55 84" stroke="${BONE}" stroke-opacity=".14" stroke-width=".5" fill="none"/>
      <path d="M29.4 92 L34.4 38" stroke="${INK}" stroke-width="1.8"/>
      <path d="M34.4 38 C33 34.6 35.4 31.6 38 33.2 C39.2 34.4 38.4 36.4 36.8 36" stroke="${INK}" stroke-width="1.4" fill="none"/>
      <path d="M38.6 46.6 L34 54.4 L36.2 56.4 L41.4 49.4 Z" fill="${p.ink}"/>`,
  },
  idiot: {
    moon: [100, 86, 30, 'bone'], trees: [[30, 238, 90, 111, -0.15]],
    draw: (p) => `
      <path d="M50 26 C44 18 36 14 28 16 C34 18 38 22 42 28 Z M50 26 C50 16 52 8 56 4 C56 12 56 20 54 28 Z M50 27 C58 20 66 18 74 20 C66 22 60 26 56 30 Z" fill="${p.ink}" class="rim"/>
      <circle cx="28" cy="16" r="1.9" fill="${GOLD}"/><circle cx="56" cy="4" r="1.9" fill="${GOLD}"/><circle cx="74" cy="20" r="1.9" fill="${GOLD}"/>
      <path d="M42 29 Q50 25 58 30 L56 31.5 Q50 28 44 31 Z" fill="${p.ink}"/>
      <ellipse cx="50" cy="34" rx="4.9" ry="5.4" fill="${p.ink}"/>
      <path d="M41.6 39.4 L43.6 37.4 L45.6 40.4 L47.6 37.4 L50 40.4 L52.4 37.4 L54.4 40.4 L56.4 37.4 L58.4 39.4 L56.4 42.4 H43.6 Z" fill="${BONE}" opacity=".85"/>
      <path d="M44 42 C42 48 42 56 44 64 L40 78 L36 92 L44 92 L48 76 L52 76 L56 92 L64 92 L60 78 L56 64 C58 56 58 48 56 42 Z" fill="${p.ink}" class="rim"/>
      <path d="M46 44 L54 52 L46 60 M54 44 L46 52 L54 60" stroke="${BONE}" stroke-opacity=".2" stroke-width=".45" fill="none"/>
      <path d="M56 46 L66 38 L67.4 40 L57.4 49 Z M44 46 L34 54 L35.4 56 L45.4 50 Z" fill="${p.ink}"/>
      <path d="M66.4 40 L72.4 28" stroke="${INK}" stroke-width="1.1"/>
      <circle cx="73.2" cy="26" r="2.8" fill="${p.ink}" stroke="${BONE}" stroke-opacity=".5" stroke-width=".4"/>
      <path d="M70.6 24.4 L72 20.6 L73.2 23.4 L74.6 20.6 L75.8 24.4 Z" fill="${p.ink}"/>`,
  },
  corbeau: {
    moon: [100, 98, 46, 'bone'], trees: [],
    draw: (p) => `
      <path d="M-4 74 C26 71.6 58 74 104 69 L104 72.4 C60 77 28 76.4 -4 78.4 Z" fill="${p.ink}" class="rim"/>
      <path d="M70 72.6 L80 62 L86 58.6 M80 62 L82.6 54 M18 75 L10 66 L6 64" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M24 41 L34 36.6 C36 32.6 42 31.6 45 33.6 C48 35.6 50 39.6 54 41.6 C62 45.6 72 53.6 80 61.6 L91 72 L84.4 74 L76 68 C70 66 64 66 58 66 C50 66 42 62 38 56 C36 52 35 48 35 45 L33 44 Z" fill="${p.ink}" class="rim"/>
      <path d="M48 46 C58 50 68 56 76 64 M50 52 C58 56 66 60 72 66 M46 44 C52 46 56 48 60 50" stroke="${BONE}" stroke-opacity=".3" stroke-width=".45" fill="none"/>
      <path d="M24 41 L33 38.6 L33 43.6 Z" fill="${INK}" stroke="${BONE}" stroke-opacity=".35" stroke-width=".35"/>
      <circle cx="39.4" cy="37.4" r=".95" fill="${BLOOD}"/>
      <path d="M54 66 L54 72.6 M58.6 66 L59.4 72.4" stroke="${INK}" stroke-width=".9"/>`,
  },
  renard: {
    moon: [124, 86, 26, 'bone'], trees: [[30, 238, 110, 121, -0.15], [176, 238, 70, 122, 0.3]],
    draw: (p) => `
      <path d="M64 90 C76 92 86 86 88 76 C90 68 86 62 81 59.6 C83.6 68 81.6 76 76 82 C72 86 66 88 60 88 Z" fill="${p.ink}" class="rim"/>
      <path d="M81 59.6 C85 62 88 66 88 72 C86 68 84 64 81 61.6 Z" fill="${BONE}" opacity=".85"/>
      <path d="M40 92 C38 84 38 76 40 70 C42 64 44 58 44 52 L42 46 C38 44 34 42.6 30 42.4 L25.4 41.4 L29.6 38.4 C33.6 36.4 37.6 34.4 39.8 32.2 L40.6 23.6 L45 31 L48 25.4 L49.2 33 C52 36 54 40 55 46 C58 54 62 62 64 72 C66 80 66 88 64 92 Z" fill="${p.ink}" class="rim"/>
      <path d="M41.4 50 C42.4 56 44.2 60.4 46.4 64 C44.4 58 43.4 54 42.6 49.6 Z" fill="${BONE}" opacity=".75"/>
      <path d="M25.4 41.4 L28 40 L27.6 42.2 Z" fill="${BONE}" opacity=".6"/>
      <ellipse cx="38.4" cy="36.2" rx="1.1" ry=".55" fill="${AMBER}" transform="rotate(-18 38.4 36.2)"/>
      <path d="M48 56 C52 64 56 74 58 86" stroke="${BONE}" stroke-opacity=".14" stroke-width=".5" fill="none"/>`,
  },
  montreur_ours: {
    moon: [92, 82, 26, 'bone'], trees: [[176, 238, 110, 131, 0.2]],
    draw: (p) => `
      <path d="M30 92 L32 76 C28 70 26 62 28 54 C29 46 32 40 36 36 L34.4 30.4 C34 26.4 36 24 39 24 L40 22 C42 20 45 20 46.4 22 C50 22 54 26 55 30 L60 32 L56.4 34.4 C54.4 36.4 52.4 38.4 50.4 40 L54 46 L60.4 49.6 L58.6 53 L52.4 50.4 C52.4 56 52.4 62 50.4 70 L52.4 76 L54.4 92 L46 92 L44 80 L40 80 L38.4 92 Z" fill="${p.ink}" class="rim"/>
      <path d="M36 44 C34 54 34 64 36 74 M44 46 C46 56 46 64 45 72" stroke="${BONE}" stroke-opacity=".16" stroke-width=".5" fill="none"/>
      <circle cx="49.4" cy="27.8" r=".9" fill="${BONE}" opacity=".7"/>
      <path d="M50 40.6 Q61 52 72.4 55.6" stroke="${BONE}" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="1.2 .9" fill="none"/>
      <ellipse cx="77" cy="45.4" rx="3.3" ry="3.7" fill="${p.ink}"/>
      <path d="M71.6 43.6 H82.4 L81.6 45 H72.4 Z M73.6 43.6 Q74.4 38.6 77 38.6 Q79.6 38.6 80.4 43.6 Z" fill="${p.ink}"/>
      <path d="M74.4 49.4 C72 51 71 55 71 60 L69.4 92 L75 92 L77 74 L79 92 L84.6 92 L83 60 C83 55 82 51 79.6 49.4 Z" fill="${p.ink}" class="rim"/>
      <path d="M72 52 L71 56.4 L73 56.6 L74 52.6 Z" fill="${p.ink}"/>`,
  },
  grand_mechant_loup: {
    moon: [100, 70, 34, 'blood'], trees: [[28, 238, 120, 141, -0.2], [172, 238, 120, 142, 0.2]],
    draw: (p) => `
      <path d="M50 94 L45.5 88.5 L40.5 89 L38 83.5 L31.5 81 L32 75 L25.5 69.5 L29 64.5 L22.5 57 L28.5 53.5 L26 45.5 L32 43 L30.5 31 L36.5 34.5 L38.5 10 L47.5 29.5 L52.5 29.5 L61.5 10 L63.5 34.5 L69.5 31 L68 43 L74 45.5 L71.5 53.5 L77.5 57 L71 64.5 L74.5 69.5 L68 75 L68.5 81 L62 83.5 L59.5 89 L54.5 88.5 Z" fill="${p.ink}" class="rim"/>
      <path d="M41 16 L44 27 M59 16 L56 27" stroke="${BONE}" stroke-opacity=".3" stroke-width=".5"/>
      <path d="M33 42 L45 47 M67 42 L55 47 M50 30 V66 M44 52 L48 66 M56 52 L52 66 M26 54 L36 60 M74 54 L64 60" stroke="${BONE}" stroke-opacity=".16" stroke-width=".5" fill="none"/>
      <path d="M35 47 L45 50 L38.6 52.6 Z M65 47 L55 50 L61.4 52.6 Z" fill="${BLOOD}"/>
      ${glow(40, 50, 7, BLOOD, p.id, 0.8)}${glow(60, 50, 7, BLOOD, p.id, 0.8)}
      <path d="M46.4 66 L53.6 66 L50 70 Z" fill="${BONE}" opacity=".7"/>
      <path d="M38 74 Q50 80 62 74 L59 81 Q50 90 41 81 Z" fill="#000" stroke="${BONE}" stroke-opacity=".3" stroke-width=".4"/>
      <path d="M41 75.8 L42.2 79.6 L43.4 76.3 Z M44.3 76.7 L45.3 79.4 L46.5 77 Z M53.5 77 L54.7 79.4 L55.7 76.7 Z M56.6 76.3 L57.8 79.6 L59 75.8 Z M43.2 83.4 L44.4 80.2 L45.8 83.8 Z M54.2 83.8 L55.6 80.2 L56.8 83.4 Z" fill="${BONE}"/>`,
  },
  infect: {
    moon: [132, 80, 22, 'pale'], trees: [[30, 238, 100, 151, -0.25]],
    draw: (p) => `
      <path d="M90 94 C88 82 86 72 82 64 L83 58 L80 56 L84 46 L80 44 L86 30 L76 40 L72 32 L71.4 42 L62 44 L48 50 L28 58 L30 62.4 L44 62 L39.4 66 L32 70.4 L46 70 L56 68 C60 74 61.4 82 61.4 94 Z" fill="${p.ink}" class="rim"/>
      <path d="M62 44 C70 52 76 62 80 72 M56 48 C64 56 70 66 72 80" stroke="${BONE}" stroke-opacity=".18" stroke-width=".5" fill="none"/>
      <path d="M31 62.4 L33 65.4 L35 62.4 L37 65.6 L39 62.4 M33.4 70 L35 67.6 L36.6 70" stroke="${BONE}" stroke-width=".6" fill="none"/>
      <ellipse cx="56.4" cy="51" rx="1.3" ry=".7" fill="#b9d36a" transform="rotate(-16 56.4 51)"/>
      <path d="M34 70.6 q-.8 2.4 0 4 q.8 -1.6 0 -4 Z" fill="#a8c25c"/>
      <ellipse cx="34" cy="78.6" rx=".9" ry="1.4" fill="#a8c25c" opacity=".85"/>
      <path d="M27 82 H41 C41 87 38 89.6 34 89.6 C30 89.6 27 87 27 82 Z M32.6 89.6 H35.4 V92 H38 V93.4 H30 V92 H32.6 Z" fill="${p.ink}" stroke="${GOLD}" stroke-opacity=".8" stroke-width=".5"/>
      <ellipse cx="34" cy="82" rx="6.6" ry="1.1" fill="#a8c25c" opacity=".6"/>`,
  },
  enfant_sauvage: {
    moon: [118, 84, 24, 'bone'], trees: [[30, 238, 120, 161, -0.1], [176, 238, 100, 162, 0.15]],
    draw: (p) => `
      <g transform="translate(6 -10)" opacity=".5"><path d="${WOLF}" fill="none" stroke="${BLOOD}" stroke-width=".7" stroke-dasharray="1.6 1.2"/><path d="${WOLF_TAIL}" fill="none" stroke="${BLOOD}" stroke-width=".7" stroke-dasharray="1.6 1.2"/></g>
      <path d="M26.6 51 L23.6 44.4 L29.4 46.4 L28.4 39.4 L33.6 43 L35.6 36.6 L38.6 42 L43 37.6 L44 44 L49.6 42 L47.6 48 L52 50.6 L46.4 53 L40 56 L32 56 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="38.4" cy="51" rx="4.6" ry="4.4" fill="${p.ink}"/>
      <circle cx="35.6" cy="51.4" r=".6" fill="${AMBER}"/><circle cx="38.6" cy="51.6" r=".6" fill="${AMBER}"/>
      <path d="M40 55.4 C47 53.6 56 55 63.4 58.6 C69.6 62 72 69.6 72 77.6 L76 92 L68 92 L64 80 L56.4 82 L58 92 L50 92 L48 82 C44 80 40.4 76.6 38.6 72.6 L32.6 82 L30.6 92 L24.4 92 L28 78 C30 70.6 32 62.6 36 56.6 Z" fill="${p.ink}" class="rim"/>
      <path d="M44 60 C50 62 56 64 62 70" stroke="${BONE}" stroke-opacity=".16" stroke-width=".5" fill="none"/>`,
  },
  bouc: {
    moon: [100, 84, 26, 'blood'], trees: [[176, 238, 96, 171, 0.2]],
    draw: (p) => `
      <path d="M8 92 V58" stroke="${INK}" stroke-width="2.2"/><path d="M8 62 Q18 60 26 50" stroke="${BONE}" stroke-opacity=".4" stroke-width=".6" fill="none"/>
      <path d="M30 52 C40 48 60 48 72 50 C78 51 82 54 84 58 L86.4 54 L88.4 56 L85 62 C84 70 82 76 80 80 L82 92 L77 92 L75 80 L70 80 L71 92 L66 92 L64 78 C56 80 46 80 40 78 L40 92 L35 92 L34 78 L30 92 L25 92 L28 76 C26 70 26 62 28 56 Z" fill="${p.ink}" class="rim"/>
      <path d="M30 54 C28 48 26 42 24 38 L18 40 L12.4 44 L10.4 42 L14 36 C16 32 20 30 24 30 C26 30 28 32 30 34 C32 40 34 46 36 50 Z" fill="${p.ink}" class="rim"/>
      <path d="M13.4 43 L15.4 52 L17.6 44 Z" fill="${p.ink}"/>
      <path d="M24 31 C25 22 33 15 42 17.4 C36 19.6 30.4 24 28.4 32 Z" fill="${p.ink}" stroke="${BONE}" stroke-opacity=".45" stroke-width=".45"/>
      <path d="M26 30.6 C29 26 34 23 38.4 23 M27 28 C30 22 35 19.4 40 19" stroke="${BONE}" stroke-opacity=".3" stroke-width=".35" fill="none"/>
      <circle cx="21.4" cy="35" r=".8" fill="${AMBER}"/>
      <path d="M40 58 C50 60 62 60 74 58" stroke="${BONE}" stroke-opacity=".14" stroke-width=".5" fill="none"/>`,
  },
  joueur_flute: {
    moon: [128, 84, 24, 'pale'], trees: [[30, 238, 100, 181, -0.15]],
    draw: (p) => `
      <path d="M20 26 c-3 -3 -1 -7 3 -6 M14 40 c-4 -2 -3 -7 1 -7 M24 14 c-2 -4 2 -7 5 -4" stroke="${BONE}" stroke-opacity=".6" stroke-width=".6" fill="none"/>
      <circle cx="23" cy="20" r="1" fill="${BONE}" opacity=".7"/><circle cx="15" cy="33" r="1" fill="${BONE}" opacity=".7"/><circle cx="29" cy="10" r="1" fill="${BONE}" opacity=".7"/>
      <path d="M58 38 C68 44 76 56 86 72 C78 68 70 64 63 61 Z" fill="${p.ink}" class="rim"/>
      <ellipse cx="54" cy="32" rx="4.8" ry="5.3" fill="${p.ink}"/>
      <path d="M47.4 29.4 Q54 21.6 62.4 27 L60.4 30 Z" fill="${p.ink}" class="rim"/>
      <path d="M60 27 C70 18 78 16 88 16 C79 20 71 24 62 29.6 Z" fill="${BLOOD}" opacity=".8"/>
      <path d="M50 37 C46 40 45 46 46 54 L44 70 L40 92 L48 92 L52 72 L56 72 L58 92 L66 92 L64 70 C64 60 62 48 59 38 Z" fill="${p.ink}" class="rim"/>
      <path d="M50 44 L40 38.4 L41.2 36.4 L52 41.4 Z M53 46 L44 41 L45 39 L55 43.6 Z" fill="${p.ink}"/>
      <path d="M22 33 L50 41" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M28 34.8 L28.6 34.9 M32 35.9 L32.6 36 M36 37 L36.6 37.2" stroke="${BONE}" stroke-width=".7"/>
      <g fill="${p.ink}"><path d="M12 92 q3 -4 7 -2 q2 1 4 0 l-1 2 Z"/><path d="M2 92 q3 -3 6 -2 q2 1 3 0 l-1 2 Z"/></g>`,
  },
  chevalier: {
    moon: [100, 78, 28, 'bone'], trees: [[30, 238, 100, 191, -0.2], [176, 238, 90, 192, 0.25]],
    draw: (p) => `
      <path d="M2 94 Q50 80 98 94 V110 H2 Z" fill="${p.ink}"/>
      <path d="M53 31 C60 40 58 52 64 60 L58.4 58.4 C56 50 54 42 52 33 Z" fill="#5a1414" opacity=".85"/>
      <path d="M47 30 L53 30 L52.6 84 L50 92 L47.4 84 Z" fill="url(#steel-${p.id})" stroke="${INK}" stroke-width=".5"/>
      <path d="M50 32 V84" stroke="${INK}" stroke-opacity=".5" stroke-width=".4"/>
      <circle cx="48.6" cy="46" r="1.3" fill="#7a3418" opacity=".9"/><circle cx="51.4" cy="58" r="1.8" fill="#7a3418" opacity=".8"/><circle cx="48.8" cy="70" r="1.1" fill="#7a3418" opacity=".9"/>
      <path d="M35 28 C42 30.4 58 30.4 65 28 L65 31.4 C58 33.6 42 33.6 35 31.4 Z" fill="${p.ink}" stroke="${GOLD}" stroke-opacity=".7" stroke-width=".5"/>
      <path d="M48.4 14 H51.6 V28.4 H48.4 Z" fill="${p.ink}" stroke="${GOLD}" stroke-opacity=".5" stroke-width=".4"/>
      <circle cx="50" cy="11.6" r="3" fill="${p.ink}" stroke="${GOLD}" stroke-opacity=".8" stroke-width=".5"/>
      <path d="M18 92 L18 76 C18 68 24 63.6 30 63.6 C36 63.6 42 68 42 76 L42 92 Z" fill="${p.ink}" class="rim"/>
      <path d="M21 74 H39 M30 64 V92" stroke="${BONE}" stroke-opacity=".4" stroke-width=".6"/>
      <path d="M22 79 H38" stroke="#000" stroke-width="1.4"/>`,
  },
  ange: {
    moon: [100, 100, 48, 'pale'], trees: [],
    draw: (p) => `
      <g transform="translate(-6 -8) scale(1.12)">
        <path d="${WINGS_L}" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".45"/>
        <path d="${WINGS_L}" transform="translate(100 0) scale(-1 1)" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".45"/>
        ${WING_FEATHERS.replaceAll('#e9dfc6', INK)}<g transform="translate(100 0) scale(-1 1)">${WING_FEATHERS.replaceAll('#e9dfc6', INK)}</g>
      </g>
      <ellipse cx="50" cy="20.6" rx="8" ry="2.4" fill="none" stroke="${GOLD}" stroke-width="1"/>
      ${glow(50, 21, 12, '#ffe9a8', p.id, 0.5)}
      <circle cx="50" cy="27" r="5" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".5"/>
      <path d="M50 32 C46 32 44 35 45 39 C40 45 38 57 36 71 L32 94 L68 94 L64 71 C62 57 60 45 55 39 C56 35 54 32 50 32 Z" fill="url(#pale-${p.id})" stroke="${INK}" stroke-width=".5"/>
      <path d="M45 42 C44 56 42 72 40 92 M50 40 V92 M55 42 C56 56 58 72 60 92" stroke="${INK}" stroke-opacity=".3" stroke-width=".45" fill="none"/>`,
  },
  soeur: {
    moon: [100, 78, 22, 'bone'], trees: [[30, 238, 90, 211, -0.15], [172, 238, 90, 212, 0.15]],
    draw: (p) => `
      ${glow(50, 62, 22, AMBER, p.id, 0.6)}
      <g transform="translate(-16 0)"><path d="${ROBE}" fill="${p.ink}" class="rim"/><ellipse cx="54" cy="37" rx="5" ry="7" fill="#000"/></g>
      <g transform="translate(116 0) scale(-1 1)"><path d="${ROBE}" fill="${p.ink}" class="rim"/><ellipse cx="54" cy="37" rx="5" ry="7" fill="#000"/></g>
      <path d="M44 66 L49 60 L51 60 L56 66 L52 66 L50 63 L48 66 Z" fill="${p.ink}"/>
      <rect x="48.8" y="52" width="2.4" height="8" fill="${BONE}" opacity=".9"/>
      <path d="M50 52 q-1.4 -2.6 0 -5 q1.4 2.4 0 5 Z" fill="${AMBER}"/>`,
  },
  pretre: {
    moon: [146, 76, 16, 'bone'], trees: [[30, 238, 90, 221, -0.2]],
    draw: (p) => `
      <path d="M30 92 V44 Q30 22 50 14 Q70 22 70 44 V92 Z" fill="#120f0a"/>
      <path d="M36 74 V44 Q36 28 50 21 Q64 28 64 44 V74 Z" fill="${AMBER}" opacity=".22"/>
      <path d="M50 21 V74 M36 50 H64 M43 24.6 V74 M57 24.6 V74" stroke="${INK}" stroke-width="1.2"/>
      ${glow(50, 48, 30, AMBER, p.id, 0.4)}
      <ellipse cx="46" cy="40" rx="4.6" ry="5.3" fill="${p.ink}"/>
      <path d="M41.6 37 Q46 32.6 50.4 37 Z" fill="${p.ink}"/>
      <path d="M41.4 45 C38 47 36 52 36 60 L34 92 L58 92 L56 60 C56 52 54 47 50.6 45 Z" fill="${p.ink}" class="rim"/>
      <path d="M46 47 V92" stroke="${BONE}" stroke-opacity=".3" stroke-width=".5"/>
      <path d="M43.8 46 H48.2 V48 H43.8 Z" fill="${BONE}" opacity=".9"/>
      <path d="M53 52 L64 40 L66 41.6 L55.4 54.4 Z" fill="${p.ink}"/>
      <path d="M66.4 22 V42 M60.6 28 H72.2" stroke="${GOLD}" stroke-width="2"/>
      ${glow(66.4, 30, 12, '#ffe9a8', p.id, 0.5)}
      <path d="M40 54 L34 60 L35.6 61.6 L41.6 56.4 Z" fill="${p.ink}"/>
      <path d="M33.4 60.4 L32 63.6 L34.6 64.6 L35.6 61.6 Z" fill="${BONE}" opacity=".7"/>`,
  },
};

// ── Lune gravée ──────────────────────────────────────────────
function moon(id, [x, y, r, tint]) {
  if (!r) return '';
  const t = MOON_TINTS[tint] ? tint : 'bone';
  const c = MOON_TINTS[t];
  return `
    <circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="url(#halo-${t}-${id})"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#moon-${t}-${id})"/>
    <g opacity=".22" fill="${c[2]}">
      <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.2}" rx="${r * 0.2}" ry="${r * 0.17}"/>
      <ellipse cx="${x + r * 0.28}" cy="${y + r * 0.26}" rx="${r * 0.26}" ry="${r * 0.2}"/>
      <ellipse cx="${x + r * 0.18}" cy="${y - r * 0.38}" rx="${r * 0.1}" ry="${r * 0.08}"/>
      <ellipse cx="${x - r * 0.38}" cy="${y + r * 0.36}" rx="${r * 0.09}" ry="${r * 0.08}"/>
    </g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#hatchD-${id})" mask="url(#term-${id})"/>
    <path d="M${x - r * 1.5} ${y + r * 0.45} C${x - r * 0.6} ${y + r * 0.3} ${x + r * 0.2} ${y + r * 0.55} ${x + r * 1.4} ${y + r * 0.35}
             M${x - r * 1.1} ${y + r * 0.62} C${x - r * 0.2} ${y + r * 0.5} ${x + r * 0.6} ${y + r * 0.72} ${x + r * 1.2} ${y + r * 0.58}"
          stroke="${INK}" stroke-opacity=".45" stroke-width=".55" fill="none" stroke-linecap="round"/>`;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV'];
const ORDER = Object.keys(ROLES);

function defs(id, tone, extra = '') {
  return `
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tone.sky[2]}"/><stop offset=".45" stop-color="${tone.sky[1]}"/><stop offset="1" stop-color="${tone.sky[0]}"/></linearGradient>
    ${Object.entries(MOON_TINTS).map(([t, c]) => `
    <radialGradient id="moon-${t}-${id}" cx="40%" cy="38%" r="65%"><stop offset="0" stop-color="${c[0]}"/><stop offset=".7" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>
    <radialGradient id="halo-${t}-${id}"><stop offset="0" stop-color="${c[1]}" stop-opacity=".38"/><stop offset=".45" stop-color="${c[1]}" stop-opacity=".1"/><stop offset="1" stop-color="${c[1]}" stop-opacity="0"/></radialGradient>`).join('')}
    ${Object.entries(GLOWS).map(([c, k]) => `<radialGradient id="glow-${k}-${id}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset=".35" stop-color="${c}" stop-opacity=".25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}
    ${Object.entries(AURA).filter(([, c], i, a) => a.findIndex(([, d]) => d === c) === i).map(([, c]) => `<radialGradient id="aura-${c.slice(1)}-${id}"><stop offset="0" stop-color="${c}" stop-opacity=".75"/><stop offset=".4" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}
    <radialGradient id="orb-${id}" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#f3ecff"/><stop offset=".35" stop-color="#9c86d8"/><stop offset="1" stop-color="#1b1233"/></radialGradient>
    <linearGradient id="pale-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f1e4"/><stop offset=".6" stop-color="#cfc6b2"/><stop offset="1" stop-color="#8d8471"/></linearGradient>
    <linearGradient id="steel-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d7b74"/><stop offset=".5" stop-color="#d9d4c6"/><stop offset="1" stop-color="#55534e"/></linearGradient>
    <pattern id="hatch-${id}" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 1.3 H2.6" stroke="${BONE}" stroke-width=".32" stroke-opacity=".16"/></pattern>
    <pattern id="hatchD-${id}" width="1.8" height="1.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)"><path d="M0 .9 H1.8" stroke="${INK}" stroke-width=".6" stroke-opacity=".55"/></pattern>
    <pattern id="ink-${id}" width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(62)"><rect width="2" height="2" fill="${INK}"/><path d="M0 1 H2" stroke="${BONE}" stroke-width=".22" stroke-opacity=".09"/></pattern>
    <linearGradient id="skyfade-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="skym-${id}"><rect width="200" height="300" fill="url(#skyfade-${id})"/></mask>
    <radialGradient id="termg-${id}" cx="72%" cy="70%" r="70%"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="term-${id}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#termg-${id})"/></mask>
    <clipPath id="win-${id}"><path d="M24 238 V88 Q24 34 100 34 Q176 34 176 88 V238 Z"/></clipPath>
    <linearGradient id="gold-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2dc95"/><stop offset=".45" stop-color="${GOLD}"/><stop offset="1" stop-color="#6e5418"/></linearGradient>
    <radialGradient id="vig-${id}" cx="50%" cy="45%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
    ${extra}`;
}

/** Illustration seule (scène dans la fenêtre gothique). */
function scene(roleId, id) {
  const S = SUBJECTS[roleId] || SUBJECTS.villageois;
  const camp = ROLES[roleId]?.camp || 'village';
  const tone = TONES[camp];
  const p = { id, ink: `url(#ink-${id})` };
  const r = rng(roleId.length * 97 + roleId.charCodeAt(0));
  const stars = Array.from({ length: 26 }, () => `<circle cx="${(28 + r() * 144).toFixed(1)}" cy="${(40 + r() * 110).toFixed(1)}" r="${(0.25 + r() * 0.55).toFixed(2)}"/>`).join('');
  const trees = (S.trees || []).map(([x, y, h, seed, lean]) => deadTree(x, y, h, seed, { lean, w: 3 })).join('');
  return `
    <rect x="0" y="0" width="200" height="300" fill="url(#sky-${id})"/>
    <rect x="0" y="0" width="200" height="300" fill="url(#hatch-${id})" mask="url(#skym-${id})"/>
    <g fill="${BONE}" opacity=".55">${stars}</g>
    ${moon(id, S.moon && [S.moon[0], Math.min(S.moon[1], 78), S.moon[2] * 0.7, S.moon[3]])}
    <path d="${forest(roleId.length * 13 + 5, { y: 214, minH: 20, maxH: 46, gap: 11, W: 200 })}" fill="${tone.hill}" opacity=".95"/>
    <path d="M0 214 C40 208 70 214 110 210 C150 206 176 212 200 209 V240 H0 Z" fill="${tone.hill}"/>
    ${trees}
    <ellipse cx="100" cy="150" rx="92" ry="98" fill="url(#aura-${(AURA[roleId] || AMBER).slice(1)}-${id})"/>
    <g transform="translate(10 72) scale(1.8)">
      ${ground(p.ink)}${grass(roleId.length * 7)}
      ${S.draw(p)}
    </g>
    <rect x="0" y="0" width="200" height="300" fill="url(#vig-${id})"/>`;
}

const CACHE = new Map();
function withIds(key, build) {
  if (!CACHE.has(key)) CACHE.set(key, build('__ID__'));
  return CACHE.get(key).replaceAll('__ID__', uid());
}

/** Recto d'une carte de rôle. */
/** Peinture dans la fenêtre gothique (si une image existe pour ce rôle). */
function painting(href, id, camp) {
  const tint = camp === 'loups' ? '#3a0606' : camp === 'solo' ? '#0d1626' : '#120d1e';
  return `<image href="${href}" x="24" y="34" width="152" height="207" preserveAspectRatio="xMidYMid slice"/>
    <rect x="0" y="0" width="200" height="300" fill="${tint}" opacity=".18" style="mix-blend-mode:multiply"/>
    <rect x="0" y="0" width="200" height="300" fill="url(#vig-${id})"/>
    <rect x="24" y="180" width="152" height="61" fill="url(#foot-${id})"/>`;
}

export function cardFrontSVG(roleId, { useImage = true } = {}) {
  const img = useImage ? roleImages.map[roleId] : null;
  return withIds(`front:${roleId}:${img || ''}`, (id) => {
    const camp = ROLES[roleId]?.camp || 'village';
    const tone = TONES[camp];
    const num = ROMAN[ORDER.indexOf(roleId) + 1] || '';
    return `<svg viewBox="0 0 200 300" class="card-svg" aria-hidden="true">
      <defs>${defs(id, tone, `<linearGradient id="foot-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06070a" stop-opacity="0"/><stop offset="1" stop-color="#06070a" stop-opacity=".85"/></linearGradient>`)}</defs>
      <rect width="200" height="300" rx="12" fill="#06070a"/>
      <g clip-path="url(#win-${id})">${img ? painting(img, id, camp) : scene(roleId, id)}</g>
      <path d="M24 238 V88 Q24 34 100 34 Q176 34 176 88 V238" fill="none" stroke="url(#gold-${id})" stroke-width="1.5"/>
      <path d="M19 241 V87 Q19 28 100 28 Q181 28 181 87 V241" fill="none" stroke="${tone.accent}" stroke-opacity=".35" stroke-width=".6"/>
      <rect x="6.5" y="6.5" width="187" height="287" rx="8" fill="none" stroke="url(#gold-${id})" stroke-width="1"/>
      <rect x="10.5" y="10.5" width="179" height="279" rx="5" fill="none" stroke="${tone.accent}" stroke-opacity=".25" stroke-width=".5"/>
      <path d="M58 21 H82 M118 21 H142" stroke="url(#gold-${id})" stroke-width=".6"/>
      <circle cx="56" cy="21" r="1.2" fill="${GOLD}"/><circle cx="144" cy="21" r="1.2" fill="${GOLD}"/>
      <text x="100" y="24.2" text-anchor="middle" font-family="Cinzel, serif" font-size="8.5" letter-spacing="1.5" fill="${tone.accent}">${num}</text>
      <g fill="url(#gold-${id})">
        <path d="M14 14 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" transform="translate(0 0) scale(.55) translate(11 11)"/>
        <path d="M186 14 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" transform="translate(186 0) scale(.55) translate(-175 11)"/>
      </g>
      <path d="M24 241 H176" stroke="url(#gold-${id})" stroke-width=".8"/>
      <circle cx="24" cy="241" r="2" fill="${GOLD}"/><circle cx="176" cy="241" r="2" fill="${GOLD}"/>
    </svg>`;
  });
}

/** Médaillon circulaire (pastilles, listes, dock). */
export function emblemSVG(roleId, { size = 48 } = {}) {
  const img = roleImages.map[roleId];
  return withIds(`emb:${roleId}:${img || ''}`, (id) => {
    const camp = ROLES[roleId]?.camp || 'village';
    const tone = TONES[camp];
    const S = SUBJECTS[roleId] || SUBJECTS.villageois;
    const p = { id, ink: `url(#ink-${id})` };
    return `<svg viewBox="0 0 100 100" width="__SIZE__" height="__SIZE__" aria-hidden="true">
      <defs>${defs(id, tone)}<clipPath id="c-${id}"><circle cx="50" cy="50" r="46"/></clipPath></defs>
      <g clip-path="url(#c-${id})">
        <rect width="100" height="100" fill="url(#sky-${id})"/>
        ${img ? `<image href="${img}" x="0" y="-8" width="100" height="150" preserveAspectRatio="xMidYMin slice"/>` : `${moon(id, [50, 42, 30, S.moon?.[3] || 'bone'])}
        <g transform="translate(4 4) scale(.92)">${ground(p.ink, 94)}${S.draw(p)}</g>`}
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#gold-${id})" stroke-width="3"/>
      <circle cx="50" cy="50" r="41.5" fill="none" stroke="${tone.accent}" stroke-opacity=".4" stroke-width="1"/>
    </svg>`;
  }).replaceAll('__SIZE__', size);
}

/** Verso commun : rosace gothique gravée. */
export function cardBackSVG() {
  return withIds('back', (id) => {
    const rays = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const r1 = 44, r2 = i % 4 === 0 ? 74 : i % 2 ? 58 : 64;
      return `M${(100 + Math.cos(a) * r1).toFixed(1)} ${(150 + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(150 + Math.sin(a) * r2).toFixed(1)}`;
    }).join(' ');
    const arcs = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const cx = 100 + Math.cos(a) * 31, cy = 150 + Math.sin(a) * 31;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="13" />`;
    }).join('');
    return `<svg viewBox="0 0 200 300" class="card-svg" aria-hidden="true">
      <defs>${defs(id, TONES.village)}
        <pattern id="bk-${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 3 H6" stroke="${GOLD}" stroke-opacity=".07" stroke-width=".5"/></pattern>
      </defs>
      <rect width="200" height="300" rx="12" fill="#07080d"/>
      <rect width="200" height="300" rx="12" fill="url(#bk-${id})"/>
      <rect x="6.5" y="6.5" width="187" height="287" rx="8" fill="none" stroke="url(#gold-${id})" stroke-width="1"/>
      <rect x="12" y="12" width="176" height="276" rx="5" fill="none" stroke="${GOLD}" stroke-opacity=".3" stroke-width=".5"/>
      <path d="${rays}" stroke="${GOLD}" stroke-opacity=".45" stroke-width=".7"/>
      <circle cx="100" cy="150" r="78" fill="none" stroke="${GOLD}" stroke-opacity=".35" stroke-width=".6"/>
      <circle cx="100" cy="150" r="44" fill="#07080d" stroke="url(#gold-${id})" stroke-width="1"/>
      <g fill="none" stroke="${GOLD}" stroke-opacity=".5" stroke-width=".6">${arcs}</g>
      <circle cx="100" cy="150" r="22" fill="url(#moon-bone-${id})"/>
      <circle cx="100" cy="150" r="22" fill="url(#hatchD-${id})" mask="url(#term-${id})"/>
      <path d="M86 150 Q100 140 114 150 Q100 160 86 150 Z" fill="#07080d" stroke="${GOLD}" stroke-width=".6"/>
      <circle cx="100" cy="150" r="4.2" fill="${BLOOD}"/><circle cx="100" cy="150" r="1.6" fill="#07080d"/>
      <text x="100" y="262" text-anchor="middle" font-family="Cinzel, serif" font-size="10" letter-spacing="4" fill="${GOLD}">THIERCELIEUX</text>
      <path d="M62 270 H138" stroke="${GOLD}" stroke-opacity=".5" stroke-width=".5"/>
      <text x="100" y="44" text-anchor="middle" font-family="Cinzel, serif" font-size="7" letter-spacing="3" fill="${GOLD}" opacity=".7">✦ LUNA ✦</text>
    </svg>`;
  });
}

// ── Sceau de joueur ──────────────────────────────────────────
const SEAL_HUES = ['#3a2a52', '#22304f', '#4a1a1f', '#3d3318', '#1f3633', '#3a2440', '#2a2f3d', '#40261a'];
export function sealColors(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ['#0b0d14', SEAL_HUES[h % SEAL_HUES.length]];
}

// ── Images personnalisées ────────────────────────────────────
export const roleImages = { map: {} };
/** Promesse résolue quand la liste des peintures est connue (l'app attend avant de s'afficher). */
export const roleImagesReady = Promise.race([
  fetch('/api/role-images').then((r) => (r.ok ? r.json() : {})).then((m) => { roleImages.map = m || {}; }).catch(() => {}),
  new Promise((r) => setTimeout(r, 2500)),
]);

// ── Décor plein écran ────────────────────────────────────────
export function sceneSVG() {
  const W = 1600;
  const r = rng(1789);
  const stars = Array.from({ length: 190 }, () => {
    const x = r() * W, y = r() * 540, s = r();
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.35 + s * 1.15).toFixed(2)}" style="animation-delay:-${(r() * 5).toFixed(2)}s;animation-duration:${(3 + r() * 5).toFixed(1)}s"/>`;
  }).join('');
  const v = village(rng(7), W, 742);
  const trees = [[90, 905, 460, 3, 0.1], [1520, 905, 480, 9, -0.12], [330, 880, 260, 17, 0.2], [1300, 880, 250, 23, -0.2]]
    .map(([x, y, h, s, l]) => deadTree(x, y, h, s, { lean: l, color: '#040406', w: 12 })).join('');
  return `<svg class="scene-svg" viewBox="0 0 ${W} 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3cf" stop-opacity=".5"/><stop offset=".35" stop-color="#e9c97a" stop-opacity=".14"/><stop offset="1" stop-color="#e9c97a" stop-opacity="0"/></radialGradient>
      <radialGradient id="moonBody" cx="40%" cy="38%" r="64%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".68" stop-color="#ecd9a8"/><stop offset="1" stop-color="#a8894a"/></radialGradient>
      <radialGradient id="moonTerm" cx="70%" cy="68%" r="70%"><stop offset=".3" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
      <mask id="moonMask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#moonTerm)"/></mask>
      <pattern id="moonHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-50)"><path d="M0 2 H4" stroke="#2a2216" stroke-width="1.2" stroke-opacity=".5"/></pattern>
      <pattern id="skyHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 3.5 H7" stroke="#cfc3a6" stroke-width=".6" stroke-opacity=".05"/></pattern>
      <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f86b8" stop-opacity="0"/><stop offset="1" stop-color="#8f86b8" stop-opacity=".2"/></linearGradient>
    </defs>
    <rect width="${W}" height="900" fill="url(#skyHatch)"/>
    <g class="stars">${stars}</g>
    <g class="moon">
      <circle cx="960" cy="200" r="260" fill="url(#moonGlow)"/>
      <circle class="moon-body" cx="960" cy="200" r="78" fill="url(#moonBody)"/>
      <g fill="#8f7643" opacity=".22"><circle cx="938" cy="180" r="15"/><circle cx="985" cy="222" r="21"/><circle cx="976" cy="166" r="8"/><circle cx="930" cy="230" r="7"/></g>
      <circle cx="960" cy="200" r="78" fill="url(#moonHatch)" mask="url(#moonMask)"/>
      <path d="M840 236 C910 228 980 244 1090 230 M870 252 C940 246 1010 258 1070 250 M900 266 C960 262 1000 270 1040 266" stroke="#07080d" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g>
    <path class="layer far" d="M0 600 C200 540 340 580 520 548 C700 516 820 572 1000 540 C1180 508 1340 560 1600 520 V900 H0 Z"/>
    <path class="layer back" d="${forest(3, { y: 690, minH: 70, maxH: 150, gap: 24, W })} M-20 690 H1620 V900 H-20 Z"/>
    <rect y="600" width="${W}" height="160" fill="url(#mist)"/>
    <path class="layer village" d="${v.d}"/>
    <g class="windows">${v.wins}</g>
    <path class="layer mid" d="${forest(11, { y: 800, minH: 120, maxH: 240, gap: 40, W })} M-20 800 H1620 V900 H-20 Z"/>
    <g class="layer-trees">${trees}</g>
  </svg>`;
}

function village(r, W, y) {
  let d = '';
  let wins = '';
  let x = W * 0.5;
  const end = W * 0.94;
  let church = false;
  while (x < end) {
    const w = 38 + r() * 46;
    const h = 30 + r() * 34;
    const roof = 18 + r() * 18;
    d += `M${x} ${y} V${y - h} L${x + w / 2} ${y - h - roof} L${x + w} ${y - h} V${y} Z `;
    if (r() < 0.5) d += `M${x + w * 0.7} ${y - h - roof * 0.4} v-${12 + r() * 8} h7 v${12 + roof * 0.3} Z `;
    for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
      if (r() < 0.75) wins += `<rect x="${(x + 8 + i * (w / 2.2)).toFixed(1)}" y="${(y - h + 10 + r() * 8).toFixed(1)}" width="6" height="8" style="animation-delay:-${(r() * 6).toFixed(2)}s"/>`;
    }
    x += w + 4 + r() * 18;
    if (!church && x > W * 0.68) {
      church = true;
      d += `M${x} ${y} V${y - 70} H${x + 34} V${y} Z M${x + 4} ${y - 70} L${x + 17} ${y - 150} L${x + 30} ${y - 70} Z M${x + 16} ${y - 150} v-14 h2 v14 Z M${x + 11} ${y - 158} h12 v2 h-12 Z `;
      wins += `<rect x="${x + 13}" y="${y - 58}" width="8" height="16" rx="4"/>`;
      x += 46;
    }
  }
  return { d, wins };
}
