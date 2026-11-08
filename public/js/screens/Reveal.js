// ─────────────────────────────────────────────────────────────
//  Distribution des cartes
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { ROLES, CAMPS } from '/shared/roles.js';
import { act } from '../net.js';
import { sfx, unlockAudio } from '../audio.js';
import { Icon, PlayerGrid, RoleCard, Seal } from '../components/ui.js';

export function Reveal({ game, you }) {
  const [stage, setStage] = useState(0); // 0 cachée · 1 rôle visible · 2 description
  const flipped = stage > 0;
  const me = game.me;
  const readyN = game.players.filter((p) => p.ready).length;
  if (!me) {
    return html`<section class="stage-center">
      <p class="eyebrow">Le meneur distribue les cartes</p>
      <h2 class="h2">Chacun découvre son destin…</h2>
      <p class="progress-text">${readyN} / ${game.players.length} villageois prêts</p>
      <${PlayerGrid} players=${game.players} you=${you} dense />
    </section>`;
  }
  const r = ROLES[me.role];
  const mates = game.players.filter((p) => p.wolf && p.id !== you);
  const flip = () => {
    unlockAudio();
    if (stage === 1) { sfx.flip(); setStage(2); return; }
    if (flipped) return;
    sfx.flip();
    setStage(1);
  };
  return html`<section class="stage-center reveal">
    <p class="eyebrow">${flipped ? 'Votre carte — gardez-la secrète' : 'Touchez la carte pour découvrir votre destin'}</p>
    <div class="reveal-card ${flipped ? 'is-flipped' : 'is-hidden'}">
      <${RoleCard} role=${me.role} flipped=${flipped} onFlip=${flip} size="lg" />
      ${flipped && html`<button class="btn ghost small hide-role" onClick=${() => { sfx.flip(); setStage(0); }}><${Icon} name="eye" size=${16} />Masquer ma carte</button>`}
    </div>
    ${flipped && html`<div class="reveal-name camp-${r.camp}" key=${me.role}>
      <span class="eyebrow">Vous êtes</span>
      <h2 class="reveal-title">${r.name.split('').map((c, i) => html`<span style=${{ '--i': i }}>${c === ' ' ? '\u00a0' : c}</span>`)}</h2>
      <p class="reveal-tagline">${r.tagline}</p>
    </div>`}
    ${stage === 1 && html`<button class="btn ghost reveal-more" onClick=${() => { sfx.flip(); setStage(2); }}>
      <${Icon} name="book" />Lire le pouvoir de ma carte</button>`}
    ${stage === 2 && html`<div class="role-explain fade-up">
      <span class="camp-tag camp-${r.camp}">${CAMPS[r.camp].name}</span>
      <p>${r.desc}</p>
      ${mates.length > 0 && html`<div class="mates"><span class="eyebrow">Vos frères de meute</span>
        <div class="pack">${mates.map((m) => html`<span class="pack-member"><${Seal} name=${m.name} size=${26} glow="blood" />${m.name}</span>`)}</div></div>`}
      <button class="btn gold big" disabled=${me.ready} onClick=${() => act({ type: 'ready' })}>
        ${me.ready ? html`<${Icon} name="check" />En attente des autres (${readyN}/${game.players.length})` : 'J’ai mémorisé mon rôle'}
      </button>
    </div>`}
  </section>`;
}
