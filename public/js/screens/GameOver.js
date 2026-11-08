// ─────────────────────────────────────────────────────────────
//  Fin de partie : victoire et révélation de toutes les cartes
// ─────────────────────────────────────────────────────────────
import { html } from 'htm/preact';
import { useEffect } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { call } from '../net.js';
import { sfx } from '../audio.js';
import { Icon, Ornament, RoleCard } from '../components/ui.js';

export function GameOver({ game, room, you }) {
  const w = game.winner;
  const winners = new Set(w.ids);
  const iWon = winners.has(you);
  return html`<section class="stage over-stage camp-${w.camp}">
    <header class="over-head">
      <p class="eyebrow">${game.me ? (iWon ? 'Vous faites partie des vainqueurs' : 'Vous avez été vaincu') : 'Fin de la partie'}</p>
      <h1 class="victory">${w.title}</h1>
      <p class="lede">${w.line}</p>
      <${Ornament}>${game.nightNo} nuits · ${game.dayNo} jours</${Ornament}>
    </header>
    <ul class="final-cards">
      ${game.players.map((p, i) => html`<li key=${p.id} class="${winners.has(p.id) ? 'winner' : ''} ${p.alive ? '' : 'dead'}" style=${{ animationDelay: `${Math.min(i, 30) * 60}ms` }}>
        <${RoleCard} role=${p.role} size="xs" showText=${false} />
        <b>${p.name}${p.lover ? ' ♥' : ''}</b>
        <small>${ROLES[p.role]?.name}${p.alive ? '' : ' · †'}</small>
      </li>`)}
    </ul>
    ${room.isHost
      ? html`<div class="ap-actions sticky"><button class="btn gold big" onClick=${() => call('game:end')}><${Icon} name="moon" />Une nouvelle veillée</button></div>`
      : html`<p class="waiting center">Le meneur va rallumer le feu de camp…</p>`}
  </section>`;
}
