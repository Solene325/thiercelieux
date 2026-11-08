import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { ROLES } from '/shared/roles.js';
import { Icon, RoleCard, Seal } from '../components/ui.js';
import { CompositionView } from './Lobby.js';

const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function Village({ game, you, room }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const alive = game.players.filter((p) => p.alive !== false).length;
  const dead = game.players.length - alive;
  const connected = game.players.filter((p) => p.connected !== false).length;
  // Le numéro conserve la place à table, même pendant une recherche.
  const visible = game.players.map((p, index) => ({ ...p, seat: index + 1 })).filter((p) =>
    (filter === 'all' || (filter === 'alive' ? p.alive !== false : p.alive === false)) && normalize(p.name).includes(normalize(query.trim())));
  return html`<div class="village-view">
    <header class="village-overview"><div><p class="eyebrow">LA PLACE DU VILLAGE</p><h2>Thiercelieux</h2><p>${game.players.length} destins autour de la même table.</p></div><span class="village-code">${room.code}</span></header>
    <dl class="village-stats"><div><dt>En vie</dt><dd>${alive}</dd></div><div><dt>Disparus</dt><dd>${dead}</dd></div><div><dt>Connectés</dt><dd>${connected}<small> / ${game.players.length}</small></dd></div></dl>
    <div class="village-layout"><section class="village-residents" aria-label="Les habitants">
      <div class="village-tools"><nav class="resident-filters" aria-label="Afficher les habitants">${[['all', 'Tous'], ['alive', 'En vie'], ['dead', 'Disparus']].map(([id, label]) => html`<button key=${id} aria-pressed=${filter === id} class=${filter === id ? 'active' : ''} onClick=${() => setFilter(id)}>${label}</button>`)}</nav><label class="resident-search"><span class="sr-only">Chercher un habitant</span><input type="search" value=${query} placeholder="Chercher un habitant…" onInput=${(e) => setQuery(e.currentTarget.value)} /></label></div>
      <p class="resident-results" role="status">${visible.length} habitant${visible.length > 1 ? 's' : ''}${query.trim() ? ' trouvé' + (visible.length > 1 ? 's' : '') : ''}</p>
      <ul class="resident-grid">${visible.map((p) => html`<li class="resident-card ${p.alive === false ? 'departed' : ''} ${p.id === you ? 'is-you' : ''}" key=${p.id}>
        <div class="resident-top"><span class="resident-seat" title="Place à table">${String(p.seat).padStart(2, '0')}</span>${p.id === you && html`<span class="resident-you">Vous</span>`}${p.id === room.hostId && html`<span class="resident-host" title="Meneur"><${Icon} name="crown" size=${14} /></span>`}</div>
        <div class="resident-avatar">${p.role && ROLES[p.role] ? html`<${RoleCard} role=${p.role} size="xs" showText=${false} />` : html`<${Seal} name=${p.name} size=${52} dead=${p.alive === false} />`}</div>
        <h3>${p.name}</h3><p class="resident-role">${ROLES[p.role]?.name || (p.idiot ? ROLES.idiot.name : 'Identité secrète')}</p>
        <div class="resident-state">${p.alive === false ? html`<${Icon} name="skull" size=${12} />Disparu` : html`<span class="resident-dot"></span>En vie`}${p.connected === false && html`<span class="resident-offline">Hors ligne</span>`}</div>
        ${(p.lover || p.wolf || p.charmed) && html`<div class="resident-bonds">${p.lover && html`<span><${Icon} name="heart" size=${12} />Amoureux</span>`}${p.wolf && html`<span><${Icon} name="wolf" size=${12} />Meute</span>`}${p.charmed && html`<span>Envoûté</span>`}</div>`}
      </li>`)}</ul>
      ${!visible.length && html`<div class="resident-empty"><${Icon} name="users" size=${28} /><p>Aucun habitant ne correspond.</p><button class="btn ghost small" onClick=${() => { setQuery(''); setFilter('all'); }}>Voir tous les habitants</button></div>`}
    </section><aside class="village-composition"><p class="eyebrow">LES RÔLES EN JEU</p><h3>Composition initiale</h3><p class="hint">Les rôles restent secrets jusqu’à leur révélation.</p><${CompositionView} comp=${game.composition} /><p class="village-seat-note">Les numéros indiquent les places à table et les voisins des joueurs.</p></aside></div>
  </div>`;
}
