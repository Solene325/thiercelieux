// ─────────────────────────────────────────────────────────────
//  Composants d'interface réutilisables
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { cardFrontSVG, cardBackSVG, emblemSVG, sealColors, roleImages } from '../art.js';
import { now } from '../net.js';
import { sfx } from '../audio.js';

// ── Icônes ───────────────────────────────────────────────────
const ICONS = {
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  voice: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  card: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 8l2.5 4L12 16l-2.5-4L12 8Z"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/>',
  skull: '<path d="M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3Z"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><path d="M10 21v-2M14 21v-2"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3C1.9 7 4.2 4 7.4 4c2 0 3.6 1.2 4.6 2.8C13 5.2 14.6 4 16.6 4 19.8 4 22.1 7 21 10.7 19.5 15.4 12 20 12 20Z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-6.8 0-4.4-4-6.7-4.6-11.2C11 6.5 9.6 9.2 10 12c-1.6-.8-2.5-2.3-2.6-4C6 9.6 5 12 5 15.2 5 19.2 8 22 12 22Z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  door: '<path d="M5 21V4a1 1 0 0 1 1-1h9l4 3v15"/><path d="M3 21h18M12 12h1"/>',
  skip: '<path d="M5 5l9 7-9 7V5ZM17 5v14"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  wolf: '<path d="M5 9 7 3l4 4h2l4-4 2 6 2 4-4 3-1 5-4 1-4-1-1-5-4-3 2-4Z"/>',
  feather: '<path d="M20 4C11 4 6 10 5 19l2-2c2 0 6-1 9-4l-3 0 5-3c1-2 2-4 2-6Z"/><path d="M4 20l9-9"/>',
};
export function Icon({ name, size = 20, cls = '' }) {
  return html`<svg class="icon ${cls}" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: ICONS[name] || '' }}></svg>`;
}

// ── Sceau de joueur ──────────────────────────────────────────
export function Seal({ name = '?', size = 48, dead = false, glow = null }) {
  const [a, b] = sealColors(name);
  const initial = (name.trim()[0] || '?').toUpperCase();
  return html`<div class="seal ${dead ? 'is-dead' : ''} ${glow ? 'glow-' + glow : ''}" style=${{ width: size + 'px', height: size + 'px', '--sa': a, '--sb': b, fontSize: size * 0.42 + 'px' }}>
    <span>${initial}</span>
  </div>`;
}

// ── Emblème de rôle ──────────────────────────────────────────
export function Emblem({ role, size = 40 }) {
  const svg = useMemo(() => emblemSVG(role, { size }), [role, size]);
  return html`<span class="emblem" dangerouslySetInnerHTML=${{ __html: svg }}></span>`;
}

export function RoleChip({ role, small }) {
  if (!role || !ROLES[role]) return null;
  return html`<span class="role-chip camp-${ROLES[role].camp} ${small ? 'small' : ''}"><${Emblem} role=${role} size=${small ? 16 : 20} />${ROLES[role].name}</span>`;
}

// ── Carte de rôle (avec retournement 3D) ─────────────────────
export function RoleCard({ role, flipped = true, onFlip, size = 'md', showText = true }) {
  const front = useMemo(() => (role ? cardFrontSVG(role, { useImage: false }) : ''), [role]);
  const back = useMemo(() => cardBackSVG(), []);
  const [failedImage, setFailedImage] = useState(null);
  const r = ROLES[role];
  const image = r && (roleImages.map[role] || `/img/roles/${role}.webp`);
  const isStatic = !onFlip && flipped && !!r;
  const Tag = onFlip ? 'button' : 'div';
  return html`<${Tag} type=${onFlip ? 'button' : undefined} role=${onFlip ? undefined : 'img'} data-role=${r?.id} class="role-card size-${size} ${flipped ? 'flipped' : ''} ${isStatic ? 'is-static' : ''}" onClick=${onFlip} aria-label=${flipped && r ? r.name : 'Retourner la carte'}>
    <div class="role-card-inner">
      ${!isStatic && html`<div class="face back" dangerouslySetInnerHTML=${{ __html: back }}></div>`}
      <div class="face front camp-${r?.camp || 'village'}">
        ${image && failedImage !== image
          ? html`<div class="art role-portrait"><img key=${image} src=${image} alt=${r.name} width="600" height="900" decoding="async" onError=${() => setFailedImage(image)} /><span class="portrait-frame" aria-hidden="true"></span></div>`
          : html`<div class="art" dangerouslySetInnerHTML=${{ __html: front }}></div>`}
        ${showText && r && html`<div class="label"><div class="name ${r.name.length > 18 ? 'long' : r.name.length > 12 ? 'mid' : ''}">${r.name}</div><div class="tag">${r.tagline}</div></div>`}
      </div>
    </div>
  </${Tag}>`;
}

// ── Compte à rebours ─────────────────────────────────────────
export function useCountdown(deadline) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, deadline - now()) : 0));
  useEffect(() => {
    if (!deadline) { setLeft(0); return; }
    const tick = () => setLeft(Math.max(0, deadline - now()));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

export function Countdown({ deadline, total, tense = false }) {
  const left = useCountdown(deadline);
  const startRef = useRef({ deadline: null, total: 1 });
  if (startRef.current.deadline !== deadline) startRef.current = { deadline, total: total || Math.max(1000, left) };
  const secs = Math.ceil(left / 1000);
  const lastBeat = useRef(null);
  useEffect(() => {
    if (!tense || !deadline || secs > 10 || secs <= 0 || lastBeat.current === secs) return;
    lastBeat.current = secs;
    sfx.heartbeat();
  }, [secs, tense, deadline]);
  if (!deadline) return null;
  const frac = Math.min(1, left / startRef.current.total);
  const R = 19, C = 2 * Math.PI * R;
  const label = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : `${secs}`;
  return html`<div class="countdown ${secs <= 10 ? 'urgent' : ''}" role="timer" aria-label="${secs} secondes restantes">
    <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r=${R} class="track"/><circle cx="22" cy="22" r=${R} class="bar" style=${{ strokeDasharray: C, strokeDashoffset: C * (1 - frac) }}/></svg>
    <span>${label}</span>
  </div>`;
}

// ── Grille de joueurs ────────────────────────────────────────
/**
 * players : [{ id, name, alive, role, wolf, lover, connected, ready, idiot }]
 * selectable : Set d'ids sélectionnables (sinon lecture seule)
 */
export function PlayerGrid({ players, you, selectable = null, selected = [], onSelect, votes = null, voters = null, dense = false, mark = null }) {
  return html`<ul class="player-grid ${dense ? 'dense' : ''} ${players.length > 24 ? 'many' : ''}">
    ${players.map((p) => {
      const can = selectable ? selectable.has(p.id) : false;
      const sel = selected.includes(p.id);
      const v = votes?.[p.id] || 0;
      return html`<li key=${p.id}>
        <button type="button" class="player ${p.alive === false ? 'dead' : ''} ${can ? 'selectable' : ''} ${sel ? 'selected' : ''} ${p.id === you ? 'me' : ''} ${mark === p.id ? 'marked' : ''}"
          disabled=${!can} onClick=${() => can && onSelect?.(p.id)} aria-pressed=${sel}>
          <div class="seal-wrap">
            <${Seal} name=${p.name} size=${dense ? 38 : 50} dead=${p.alive === false} glow=${sel ? 'gold' : p.wolf ? 'blood' : null} />
            ${p.alive === false && html`<span class="dead-mark"><${Icon} name="skull" size=${16} /></span>`}
            ${p.role && html`<span class="mini-card" title=${ROLES[p.role]?.name}><${RoleCard} role=${p.role} size="mini" showText=${false} /></span>`}
            ${p.lover && html`<span class="lover-mark" title="Amoureux"><${Icon} name="heart" size=${13} /></span>`}
            ${p.charmed && html`<span class="charm-mark" title="Envoûté par la flûte">♪</span>`}
            ${p.wolf && p.alive !== false && html`<span class="wolf-mark" title="La meute"><${Icon} name="wolf" size=${13} /></span>`}
            ${p.connected === false && html`<span class="off-mark" title="Déconnecté"></span>`}
            ${p.ready && html`<span class="ready-mark"><${Icon} name="check" size=${12} /></span>`}
            ${v > 0 && html`<span class="vote-count">${v}</span>`}
          </div>
          <div class="pname">${p.name}${p.id === you ? html`<em> (vous)</em>` : ''}</div>
          ${p.role ? html`<${RoleChip} role=${p.role} small />` : p.idiot ? html`<${RoleChip} role="idiot" small />` : null}
          ${voters?.[p.id]?.length ? html`<div class="voters">${voters[p.id].map((n) => html`<span>${n}</span>`)}</div>` : null}
        </button>
      </li>`;
    })}
  </ul>`;
}

// ── Tiroir (bottom sheet) ────────────────────────────────────
export function Sheet({ open, onClose, title, icon, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return html`<dialog ref=${ref} class="sheet ${wide ? 'wide' : ''}" aria-label=${title} closedby="any"
    onClose=${() => onClose?.()}>
    <header class="sheet-head">
      <h3>${icon && html`<${Icon} name=${icon} size=${18} />`}${title}</h3>
      <button class="icon-btn" autofocus onClick=${() => ref.current.close()} aria-label="Fermer"><${Icon} name="close" /></button>
    </header>
    <div class="sheet-body">${open ? children : null}</div>
  </dialog>`;
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return html`<label class="toggle ${disabled ? 'disabled' : ''}">
    <span class="toggle-text"><span>${label}</span>${hint && html`<small>${hint}</small>`}</span>
    <input type="checkbox" checked=${checked} disabled=${disabled} onChange=${(e) => onChange(e.currentTarget.checked)} />
    <span class="toggle-track"><span class="toggle-thumb"></span></span>
  </label>`;
}

export function Stepper({ value, min = 0, max = 99, onChange, disabled, label }) {
  return html`<div class="stepper" role="group" aria-label=${label}>
    <button type="button" disabled=${disabled || value <= min} onClick=${() => onChange(Math.max(min, value - 1))} aria-label=${label ? `Moins de ${label}` : 'Moins'}>−</button>
    <span>${value}</span>
    <button type="button" disabled=${disabled || value >= max} onClick=${() => onChange(Math.min(max, value + 1))} aria-label=${label ? `Plus de ${label}` : 'Plus'}>+</button>
  </div>`;
}

export function Ornament({ children }) {
  return html`<div class="ornament"><span class="line"></span><span class="gem"></span>${children && html`<span class="otext">${children}</span>`}<span class="gem"></span><span class="line"></span></div>`;
}
