// ─────────────────────────────────────────────────────────────
//  Particules d'ambiance (lucioles, poussière d'or, braises)
//  + gerbes ponctuelles au ralenti lors des révélations.
// ─────────────────────────────────────────────────────────────
const DUST = { colors: ['206,200,185'], size: [0.5, 1], vy: [-0.025, 0], vx: 0.025, glow: 3, twinkle: false };
const MOODS = {
  night: { ...DUST, n: 8 },
  tavern: { ...DUST, n: 6 },
  dawn: { ...DUST, n: 4 },
  day: { ...DUST, n: 0 },
  vote: { ...DUST, n: 5 },
};

let canvas, c2d, W = 0, H = 0, dpr = 1;
let mood = 'night';
let ambient = [];
let bursts = [];
const rand = (a, b) => a + Math.random() * (b - a);

function spawn(cfg, anywhere = true) {
  return {
    x: rand(0, W), y: anywhere ? rand(0, H) : H + 10,
    r: rand(...cfg.size), vx: rand(-cfg.vx, cfg.vx), vy: rand(...cfg.vy),
    c: cfg.colors[Math.floor(Math.random() * cfg.colors.length)], a: rand(0.3, 0.9), ph: rand(0, Math.PI * 2),
  };
}

export function setParticleMood(m) {
  if (!MOODS[m] || m === mood) { mood = MOODS[m] ? m : mood; return; }
  mood = m;
  const cfg = MOODS[m];
  ambient = Array.from({ length: Math.round(cfg.n * Math.min(1, W / 900 + 0.4)) }, () => spawn(cfg));
}

/** Gerbe de particules au ralenti (x, y en pixels écran). */
export function burst(x, y, { color = '255,210,120', n = 70, speed = 2.2, life = 220 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = rand(0.2, 1) * speed;
    bursts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, r: rand(0.8, 2.6), c: color, life: rand(life * 0.5, life), t: 0 });
  }
}
export function burstAt(el, opts) {
  if (!el) return;
  const b = el.getBoundingClientRect();
  burst(b.left + b.width / 2, b.top + b.height / 2, opts);
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function frame(t) {
  c2d.clearRect(0, 0, W, H);
  const cfg = MOODS[mood];
  c2d.globalCompositeOperation = 'lighter';
  for (const p of ambient) {
    p.x += p.vx + Math.sin(t / 2200 + p.ph) * 0.12;
    p.y += p.vy;
    if (p.y < -20 || p.y > H + 20 || p.x < -20 || p.x > W + 20) Object.assign(p, spawn(cfg, false), { y: p.vy < 0 ? H + 10 : -10 });
    const a = cfg.twinkle ? p.a * (0.55 + 0.45 * Math.sin(t / 700 + p.ph)) : p.a * 0.7;
    draw(p.x, p.y, p.r, p.c, a, cfg.glow);
  }
  for (const p of bursts) {
    p.t++;
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.004; // ralenti : forte traînée, gravité faible
    draw(p.x, p.y, p.r, p.c, Math.max(0, 1 - p.t / p.life), 14);
  }
  bursts = bursts.filter((p) => p.t < p.life);
  c2d.globalCompositeOperation = 'source-over';
  requestAnimationFrame(frame);
}

function draw(x, y, r, c, a, glow) {
  const g = c2d.createRadialGradient(x, y, 0, x, y, r * glow * 0.5 + r);
  g.addColorStop(0, `rgba(${c},${a})`);
  g.addColorStop(0.25, `rgba(${c},${a * 0.35})`);
  g.addColorStop(1, `rgba(${c},0)`);
  c2d.fillStyle = g;
  c2d.beginPath();
  c2d.arc(x, y, r * glow * 0.5 + r, 0, Math.PI * 2);
  c2d.fill();
}

export function initParticles() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  c2d = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  const m = mood; mood = null; setParticleMood(m);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
}
