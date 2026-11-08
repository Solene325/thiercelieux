// ─────────────────────────────────────────────────────────────
//  Le jour : l'aube, le conseil des villageois, le chasseur
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { ROLES, DEATH_CAUSES } from '/shared/roles.js';
import { act } from '../net.js';
import { sfx } from '../audio.js';
import { Emblem, Icon, PlayerGrid, RoleCard, Seal } from '../components/ui.js';
import { PickAction } from './Actions.js';

function DeathItem({ d, i, name }) {
  return html`<article class="death" style=${{ '--d': `${Math.min(i * 60, 240)}ms` }}>
    ${d.role
      ? html`<div class="death-card"><${RoleCard} role=${d.role} size="sm" flipped /></div>`
      : html`<${Seal} name=${name} size=${84} dead />`}
    <h3>${name}</h3>
    <p class="cause cause-${d.cause}">${DEATH_CAUSES[d.cause]}</p>
    ${d.role && html`<p class="was">${ROLES[d.role].name}</p>`}
  </article>`;
}

export function DeathReveal({ deaths, players }) {
  const name = (id) => players.find((p) => p.id === id)?.name || '?';
  const deathsKey = deaths.map((d) => d.id).join('|');
  useEffect(() => { if (deaths.length) sfx.death(); }, [deathsKey]);
  return html`<div class="deaths">
    ${deaths.map((d, i) => html`<${DeathItem} key=${d.id} d=${d} i=${i} name=${name(d.id)} />`)}
  </div>`;
}

export function Dawn({ game }) {
  const deaths = game.lastDeaths || [];
  return html`<section class="stage-center dawn-stage">
    <p class="eyebrow">L’aube du jour ${game.dayNo + 1}</p>
    <h2 class="h2">Le jour se lève sur Thiercelieux</h2>
    ${deaths.length === 0
      ? html`<p class="lede miracle">Par miracle, personne n’a péri cette nuit.</p>`
      : html`<p class="lede">Le village se réveille… mais pas tout le monde.</p><${DeathReveal} deaths=${deaths} players=${game.players} />`}
  </section>`;
}

export function Council({ game, you }) {
  const a = game.action;
  const alive = game.players.filter((p) => p.alive).length;
  const need = Math.floor(alive / 2) + 1;
  const raven = game.ravenActive && game.players.find((p) => p.id === game.ravenActive);
  return html`<section class="stage day-stage">
    <header class="stage-head">
      <p class="eyebrow">Jour ${game.dayNo}</p>
      <h2 class="h2">Le conseil des villageois</h2>
      <p class="lede">Débattez, accusez, défendez-vous. Qui se cache derrière un visage familier ?</p>
      ${game.bearGrowl != null && html`<p class="raven-note ${game.bearGrowl ? 'growl' : 'calm'}"><${Emblem} role="montreur_ours" size=${22} />${game.bearGrowl ? 'Grrr… L’ours du montreur grogne : un loup est assis près de lui !' : 'L’ours du montreur reste paisible.'}</p>`}
      ${raven && html`<p class="raven-note"><${Icon} name="feather" size=${16} />Le Corbeau a désigné <b>${raven.name}</b> : deux voix pèseront contre lui.</p>`}
    </header>
    <${PlayerGrid} players=${game.players} you=${you} mark=${game.ravenActive} />
    ${a?.type === 'callVote' && html`<div class="ap-actions sticky">
      <button class="btn blood" disabled=${a.done} onClick=${() => act({ type: 'callVote' })}><${Icon} name="flame" />
        ${a.done ? `Vote réclamé (${game.readyCount}/${need})` : `Passer au vote (${game.readyCount}/${need})`}
      </button>
    </div>`}
  </section>`;
}

export function Hunter({ game, you }) {
  const a = game.action;
  const hunter = game.players.find((p) => p.id === game.hunter);
  const shot = game.hunterShot;
  useEffect(() => { if (shot?.target) sfx.shot(); }, [shot?.target]);
  if (a?.type === 'pick') return html`<section class="stage hunter-stage"><${PickAction} action=${a} game=${game} you=${you} accent="blood" /></section>`;
  return html`<section class="stage-center hunter-stage">
    <div class="reticle" aria-hidden="true"></div>
    <p class="eyebrow">Le dernier souffle du Chasseur</p>
    <h2 class="h2">${hunter?.name} épaule son fusil…</h2>
    ${shot
      ? shot.target
        ? html`<p class="lede">Un coup de feu déchire le silence.</p><${DeathReveal} deaths=${game.lastDeaths} players=${game.players} />`
        : html`<p class="lede">Le Chasseur s’éteint… sans tirer.</p>`
      : html`<p class="lede">Qui emportera-t-il dans la tombe ?</p>`}
  </section>`;
}
