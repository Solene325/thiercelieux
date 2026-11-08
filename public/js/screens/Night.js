// ─────────────────────────────────────────────────────────────
//  La nuit : réveils successifs des rôles
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { ROLES } from '/shared/roles.js';
import { Icon, PlayerGrid } from '../components/ui.js';
import { DoneAction, HoundAction, InfectAction, PickAction, SpyAction, WitchAction, WolvesAction } from './Actions.js';

function GodPanel({ game }) {
  const gi = game.godInfo;
  if (!gi) return null;
  const name = (id) => game.players.find((p) => p.id === id)?.name || '—';
  const wv = Object.entries(game.wolfVotes || {});
  return html`<aside class="god panel">
    <h3><${Icon} name="eye" size=${16} />Le regard du meneur</h3>
    <ul>
      ${game.step === 'loups' && html`<li>Votes de la meute : ${wv.length ? wv.map(([w, t]) => `${name(w)} → ${name(t)}`).join(' · ') : 'aucun'}</li>`}
      <li>Victime de la meute : <b>${gi.night.wolfVictim ? name(gi.night.wolfVictim) : '—'}</b></li>
      <li>Protégé : ${gi.night.guardTarget ? name(gi.night.guardTarget) : '—'}</li>
      <li>Potions : ${gi.potions.life ? 'résurrection ✓' : 'résurrection ✗'} · ${gi.potions.death ? 'mort ✓' : 'mort ✗'}${gi.night.witchSave ? ' · sauvetage ce soir' : ''}${gi.night.witchKill ? ` · poison sur ${name(gi.night.witchKill)}` : ''}</li>
      ${gi.lovers && html`<li>Amoureux : ${name(gi.lovers[0])} ♥ ${name(gi.lovers[1])}</li>`}
      ${gi.houndChoice && html`<li>Chien-Loup : ${gi.houndChoice === 'loup' ? 'rallié à la meute' : 'fidèle au village'}</li>`}
      ${gi.spy && html`<li>La Petite Fille espionne…</li>`}
      ${gi.night.gmlKill && html`<li>Seconde proie du Grand Méchant Loup : ${name(gi.night.gmlKill)}</li>`}
      ${gi.infected?.length > 0 && html`<li>Infectés : ${gi.infected.map(name).join(', ')}</li>`}
      ${gi.wildModel && html`<li>Modèle de l’Enfant Sauvage : ${name(gi.wildModel)}${gi.wildWolf ? ' (mort — il a rejoint la meute)' : ''}</li>`}
      ${gi.charmed?.length > 0 && html`<li>Envoûtés : ${gi.charmed.map(name).join(', ')}</li>`}
      ${gi.rustyPending && html`<li>Tétanos : ${name(gi.rustyPending)} mourra à l’aube prochaine</li>`}
    </ul>
  </aside>`;
}

export function Night({ game, you }) {
  const a = game.action;
  const label = game.stepLabel;
  const me = game.me;
  let panel = null;
  if (a) {
    if (a.type === 'pick') panel = html`<${PickAction} action=${a} game=${game} you=${you} accent=${['loup_blanc', 'grand_mechant_loup'].includes(a.kind) ? 'blood' : 'gold'} />`;
    else if (a.type === 'hound') panel = html`<${HoundAction} />`;
    else if (a.type === 'infect') panel = html`<${InfectAction} action=${a} game=${game} />`;
    else if (a.type === 'wolves') panel = html`<${WolvesAction} action=${a} game=${game} you=${you} />`;
    else if (a.type === 'spy') panel = html`<${SpyAction} action=${a} />`;
    else if (a.type === 'witch') panel = html`<${WitchAction} action=${a} game=${game} you=${you} />`;
    else if (a.type === 'done') panel = html`<${DoneAction} action=${a} game=${game} />`;
  }
  if (panel) return html`<section class="stage night-stage">${panel}</section>`;

  const ghost = me && !me.alive;
  const intro = game.step === 'endormissement';
  return html`<section class="stage-center night-stage sleeping">
    ${ghost
      ? html`<p class="eyebrow">Votre âme erre entre les maisons</p><h2 class="h2">Les vivants dorment…</h2>`
      : intro
        ? html`<p class="eyebrow">Nuit ${game.nightNo}</p><h2 class="h2">La nuit tombe sur le village</h2><p class="lede">Posez votre téléphone, fermez les yeux… Thiercelieux s’endort.</p>`
        : html`<p class="eyebrow">Nuit ${game.nightNo}</p>
          <h2 class="h2 step-title" key=${game.step}>${label ? label.title : 'Le village dort'}</h2>
          <p class="lede">${label ? label.sub : 'Un silence pesant enveloppe les chaumières…'}</p>
          <p class="closed-eyes"><span></span>Gardez les yeux fermés</p>`}
    <${GodPanel} game=${game} />
    ${game.god && html`<${PlayerGrid} players=${game.players} you=${you} dense />`}
  </section>`;
}
